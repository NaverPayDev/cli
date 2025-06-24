#!/bin/bash

echo "== @naverpay/commit-helper =="
for i in {1..5}; do
  time npx -y @naverpay/commit-helper .git/COMMIT_EDITMSG
done

echo "== @naverpay/commithelper-go =="
for i in {1..5}; do
  time npx commithelper-go .git/COMMIT_EDITMSG
done
