# @naverpay/commit-helper

This CLI provides various tools which assist your commit based on [husky](https://typicode.github.io/husky/) `commit-msg` hook.

## How to use

### .husky/commit-msg

```
npx --yes @naverpay/commit-helper@latest $1
```

> `@latest` is not necessary but this option always provides latest version of commit-helper.

## what it does

### Tag related issue

> Automatically Add your related github issue number at your commit message through your branch name

```shell
➜  your-repo git:(feature/1) git add . &&  git commit -m ":memo: test"
ℹ No staged files match any configured task.
$ git branch --show-current
feature/1
[feature/1 1e70c244f] [#1] :memo: test
 1 file changed, 1 insertion(+)
```

Your issue number is automatically tagged base on your setting (`.commithelperrc.json`)

### Blocking commit

- Blocks direct commit toward `main`, `develop` `master` branch by throwing error on commit attempt.
- To block specific branches, add at `protect` field on `commithelperrc`.

#### Customization

If you need to add customized commit rule, use [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) rules as `commithelper`. `cosmiconfig` is a library widely used in tools like `eslint` and `prettier` to read `rc` configuration files. `commithelper` also uses `cosmiconfig`. If there is any conflict with predefined rules, `cosmicconfig` takes precedence.

### commithelperrc

This is Basic rule of `.commithelperrc`.

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

- Key of rules field means branch prefix. By `feature` key, this rule is applied to branches named using the `feature/***` pattern.
- Value represents the repository to be tagged. For example, rule with value 'your-org/your-repo' tags 'your-org/your-repo#1'.
- A rule with a `null` value tags repository itself.

#### protect

- Defines branch prefixes that are blocked from committing. `main`, `master`, `develop` branch is blocked by default.

### Example

```json
// commithelperrc.json
{
    "protect": ["epic"],
    "rules": {
        "feature": null,
        "qa": "your-org/your-repo"
    }
}
```

> For example as above,
>
> - commit on `feature/1` branch will be tagged as `[#1]`.
> - commit on `qa/1` branch will be tagged as `[your-org/your-repo#1]`.
> - direct commit attempt toward `main`, `master`, `develop`, `epic/***` branch will be blocked

## Q&A

- What happens if commit has already tagged issue like `[your-org/your-repo#1]`?
  - `commithelper` do not works. Already tagged issue remains unchanged
- How does commit-helper behaves on `feature/1_xxx` `feature/1-xxx` patterned branch name?
  - It works same as `feature/1` branch.
