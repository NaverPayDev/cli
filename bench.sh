#!/bin/bash

echo "== 기존 패키지 실행 시간 측정 =="
for i in {1..5}; do
  time npx -y @naverpay/commit-helper .git/COMMIT_EDITMSG
done

echo "== 내가 작성한 패키지 실행 시간 측정 =="
for i in {1..5}; do
  time npx commithelper-go .git/COMMIT_EDITMSG
done
