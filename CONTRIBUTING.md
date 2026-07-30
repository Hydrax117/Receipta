# Contributing to Receipta

Thank you for your interest in contributing to Receipta! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Receipta/Receipta
   cd receipta
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

- `contract/` - Soroban smart contract (Rust)
- `backend/` - REST API server (Node.js/TypeScript)
- `frontend/` - Web application (Next.js/React)
- `scripts/` - Deployment and utility scripts

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests for new functionality

3. **Test your changes**
   ```bash
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring
   - `chore:` - Maintenance tasks

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

### Rust (Smart Contract)
- Follow Rust standard formatting (`cargo fmt`)
- Run clippy for linting (`cargo clippy`)
- Document public functions with doc comments

### TypeScript (Backend/Frontend)
- Use TypeScript strict mode
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for complex functions

## Testing

### Smart Contract Tests
```bash
cd contract
cargo test
```

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Pull Request Process

1. Update README.md with details of changes if needed
2. Update documentation for any API changes
3. Ensure all tests pass
4. Request review from maintainers
5. Address review feedback
6. Squash commits if requested

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

## Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists or is planned
- Describe the use case clearly
- Explain why it would benefit users
- Consider implementation complexity

## Community

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Celebrate contributions of all sizes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
