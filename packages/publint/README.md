# @naverpay/publint

@naverpay/publint is a specialized tool for verifying and linting npm package structure and `package.json` files, tailored specifically for NaverPay frontend developers. It ensures that packages meet both general npm standards and NaverPay's internal best practices for modern JavaScript and TypeScript projects.

## Features

- Validates the structure and content of `package.json`
- Enforces NaverPay-specific frontend development rules
- Supports TypeScript projects
- Verifies package types (regular, module, or dual)
- Checks the `exports` field
- Ensures presence of required fields
- Validates output paths
- Provides a user-friendly CLI interface

## NaverPay Frontend Guidelines

This tool incorporates NaverPay's internal frontend development guidelines, ensuring that all packages published by the team maintain consistent quality and structure. Some of the NaverPay-specific checks include:

- Adherence to NaverPay's naming conventions
- Verification of required NaverPay-specific fields in `package.json`
- Checks for compliance with NaverPay's code structuring rules
- Validation of dependencies against NaverPay's approved list

By using @naverpay/publint, developers can ensure their packages are compliant with team standards before publication.

## Installation

You can install @naverpay/publint globally:

```bash
npm install -g @naverpay/publint
```

Or use it directly with npx without installing:

```bash
npx @naverpay/publint
```

## Usage

If installed globally, you can use publint directly in your project directory:

```bash
publint
```

Or specify a custom directory:

```bash
publint ./my-project
```

Using npx (without global installation):

```bash
npx @naverpay/publint
```

Or with a custom directory:

```bash
npx @naverpay/publint ./my-project
```

## What it checks

- Presence and validity of `package.json`
- Correct structure of the `exports` field
- Presence of required fields in `package.json`, including NaverPay-specific fields
- Package type (regular, module, or dual) and corresponding structure
- TypeScript configuration and type definition files (if applicable)
- Validity of output paths defined in the `exports` field
- Compliance with NaverPay frontend development guidelines

## Output

The tool will provide detailed feedback on the verification process, including any errors or warnings encountered during the checks. It will specifically highlight any deviations from NaverPay's internal standards.

## Contributing

Contributions are welcome from NaverPay team members! Please ensure you're familiar with our internal development guidelines before submitting a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgements

This project was inspired by [publint](https://github.com/bluwy/publint), created by Bjorn Lu. We appreciate their work in improving the npm package ecosystem. @naverpay/publint builds upon this foundation to meet the specific needs of the NaverPay frontend development team.