# @naverpay/commit-helper

[husky](https://typicode.github.io/husky/) 의 `commit-msg`훅을 기반으로, 커밋에 필요한 각 종 도구를 제공하는 cli 입니다.

## How to use

### .husky/commit-msg

```
npx --yes @naverpay/commit-helper@latest $1
```

> `@latest`가 아니어도 상관없습니다만, `latest`라면 항상 최신버전을 사용하실 수 있습니다.

## what it does

### 커밋에 이슈 태깅

```shell
➜  your-repo git:(feature/1) git add . &&  git commit -m ":memo: test"
ℹ No staged files match any configured task.
$ git branch --show-current
feature/1
[feature/1 1e70c244f] [#1] :memo: test
 1 file changed, 1 insertion(+)
```

이제 커밋을 하면, `.commithelperrc.json`에 따라서 자동으로 이슈번호가 태깅됩니다.

#### 사용자화

만약 사전에 정의된 규칙외에 레포에 특별한 규칙을 넣고 싶으시다면, [cosmicconfig](https://github.com/cosmiconfig/cosmiconfig) 규칙을 `commithelper`로 사용해주세요. `cosmicconfig`는 `eslint` `prettier` 등지에서 널리 사용되는 `rc` 설정을 읽어서 사용하는 라이브러리로, `commithelper`도 `cosmicconfig`를 사용합니다. 그리고 사전에 정의된 규칙과 충돌이 있다면 `cosmicconfig`를 우선합니다.

#### `.commithelperrc.json`

```json
{
    "rules": {
        "feature": null,
        "qa": "your-org/your-repo"
    }
}
```

> 위와 같이 있다면,
>
> - `feature/1`은 `[#1]` 로 태깅됩니다.
> - `qa/1`은 `[your-org/your-repo#1]`로 태깅됩니다.

### 커밋 방지

- `main`, `develop` `master` 브랜치에 직접적으로 하는 것을 방지하며, `main`, `develop` `master` 브랜치에 커밋을 하려고 하면 에러를 발생시킵니다.
- 이외에 다른 브랜치를 막고 싶다면, `commithelperrc` 의 `protect`필드를 추가해주세요.

### commithelperrc

`.commithelperrc`의 규칙은 다음과 같습니다.

```json
{
    "protect": ["main", "master", "develop"],
    "rules": {
        "feature": null,
        "qa": "your-org/your-repo"
    }
}
```

#### rules

- 키는 브랜치명 규칙입니다. `feature`를 키로 한다면, `feature/***` 네이밍의 브랜치들이 타겟이 됩니다.
- 값은 해당 브랜치와 매칭할 레포명입니다. 예를 들어 'your-org/your-repo' 라고 값이 설정되어 있다면, 'your-org/your-repo#1' 로 연결됩니다.
- 값이 만약 `null`이라면, 자기 저장소 자신을 태깅합니다. `feature`가 `null`이라면, 위와 같이 `[#1]`로 태깅합니다.

#### protect

- 커밋을 막고 싶은 브랜치를 배열로 넣어주세요. `main`, `master`, `develop`는 기본적으로 막힙니다.

## Q&A

- 커밋메시지에 이미 `[your-org/your-repo#1]` 와 같은 형식의 태깅이 되어 있으면 어떻게 되나요?
  - `commithelper`는 동작하지 않고, 해당 커밋 메시지 태깅을 존중합니다.
- `.commithelperrc` 룰과 자체 규칙 룰이 충돌하면 어떻게 되나요?
  - `cosmicconfig`를 우선합니다.
- `feature/1_xxx` `feature/1-xxx` 와 같은 형태의 브랜치명은 어떻게 처리되나요?
  - `feature/1`로 처리됩니다.
  - 자세한 내용은 테스트 코드를 참조하세요.
