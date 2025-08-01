# @naverpay/commit-helper

> 브랜치 이름을 기반으로 커밋 메시지에 이슈 번호를 자동으로 추가하고 중요 브랜치를 보호하는 도구

## 설치

```bash
npm install --save-dev @naverpay/commit-helper
# or
yarn add -D @naverpay/commit-helper
# or
pnpm add -D @naverpay/commit-helper
```

## 빠른 시작

### 1. Husky 설치 (아직 설치하지 않은 경우)

```bash
npm install --save-dev husky
npx husky init
```

### 2. commit-msg 훅 추가

```bash
echo 'npx --yes @naverpay/commit-helper@latest $1' > .husky/commit-msg
chmod +x .husky/commit-msg
```

### 3. 커밋 생성

```bash
git checkout -b feature/123-new-feature
git add .
git commit -m "새로운 기능 추가"
# 결과: [#123] 새로운 기능 추가
```

## 주요 기능

### 🏷️ 자동 이슈 태깅

브랜치 이름에서 이슈 번호를 추출하여 커밋 메시지에 추가:

- `feature/123` → `[#123] 메시지`
- `qa/456` → `[your-org/your-repo#456] 메시지`
- `hotfix/789-urgent` → `[#789] 메시지`

### 🛡️ 브랜치 보호

보호된 브랜치에 직접 커밋 방지:

- 기본값: `main`, `master`, `develop`
- 설정으로 커스터마이징 가능

### ⚙️ 유연한 설정

커스텀 규칙과 원격 설정 상속을 지원합니다.

## 설정

프로젝트 루트에 `.commithelperrc.json` 파일 생성:

```json
{
    "protect": ["main", "master", "develop", "staging"],
    "rules": {
        "feature": null,
        "bugfix": null,
        "hotfix": null,
        "qa": "naverpay/qa-issues",
        "docs": "naverpay/documentation"
    }
}
```

### 설정 옵션

#### `protect` (배열)

직접 커밋을 차단할 브랜치 이름 목록

- 기본값: `["main", "master", "develop"]`

#### `rules` (객체)

브랜치 접두사와 저장소 이름의 매핑

- 키: 브랜치 접두사 (예: `"feature"`)
- 값: 저장소 이름 또는 현재 저장소인 경우 `null`

#### `extends` (문자열)

설정을 상속받을 URL:

```json
{
    "extends": "https://raw.githubusercontent.com/naverpay/standards/main/.commithelperrc.json"
}
```

## 예제

### 기본 기능 브랜치

```bash
git checkout -b feature/NP-1234-결제-통합
git commit -m "결제 게이트웨이 구현"
# 결과: [#1234] 결제 게이트웨이 구현
```

### 외부 저장소 참조

설정 파일:

```json
{
    "rules": {
        "qa": "naverpay/qa-tracker"
    }
}
```

```bash
git checkout -b qa/789-결제-플로우-테스트
git commit -m "결제 E2E 테스트 추가"
# 결과: [naverpay/qa-tracker#789] 결제 E2E 테스트 추가
```

### 보호된 브랜치

```bash
git checkout main
git commit -m "직접 커밋"
# 오류: ❌ 보호된 브랜치 'main'에 직접 커밋할 수 없습니다!
# 기능 브랜치를 생성하고 풀 리퀘스트를 사용하세요.
```

## 고급 사용법

### Lefthook 연동

Husky 대신 Lefthook을 선호하는 경우:

```yaml
# lefthook.yml
commit-msg:
    scripts:
        'commit-helper':
            runner: npx --yes @naverpay/commit-helper@latest {1}
```

### CI/CD 연동

CI에서 커밋 메시지 검증:

```yaml
# .github/workflows/pr.yml
- name: 커밋 메시지 검증
  run: |
      git log --format=%s origin/main..HEAD | while read msg; do
        if ! echo "$msg" | grep -qE '^\[[#A-Za-z0-9-/]+\]'; then
          echo "잘못된 커밋 메시지: $msg"
          exit 1
        fi
      done
```

## API

### CLI 사용법

```bash
npx @naverpay/commit-helper <commit-msg-file>
```

- **매개변수**:
  - `commit-msg-file` (문자열): 커밋 메시지 파일 경로 (git hook이 제공)
- **반환값**: 성공 시 종료 코드 0, 실패 시 1
- **에러**: 잘못된 설정이나 보호된 브랜치인 경우 stderr로 에러 메시지 출력

## 자주 묻는 질문

**Q: 이미 이슈 태그가 있는 경우에도 작동하나요?**  
A: 네, 커밋 메시지에 이미 `[#123]` 같은 태그가 있으면 commit-helper는 건너뜁니다.

**Q: 여러 이슈 번호를 사용할 수 있나요?**  
A: 브랜치 이름에서는 하나의 이슈 번호만 지원하지만, 커밋 메시지에 수동으로 추가할 수 있습니다.

**Q: 어떤 브랜치 이름 형식을 지원하나요?**  
A: 슬래시 뒤에 숫자가 있는 모든 형식: `feature/123`, `feature/123-설명`, `feature/123_설명`

**Q: 일시적으로 보호를 우회하려면?**  
A: `--no-verify` 플래그 사용: `git commit --no-verify -m "긴급 수정"`

## 문제 해결

### 훅이 실행되지 않음

1. 파일 권한 확인: `ls -la .husky/commit-msg`
2. Husky 설치 확인: `npx husky install`

### 설정이 로드되지 않음

1. 파일 이름 확인: `.commithelperrc.json` (점으로 시작)
2. JSON 문법 검증

## 라이선스

MIT
