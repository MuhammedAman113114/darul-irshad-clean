# 🚀 GitHub Setup Guide

This guide will help you push your React Native mobile app to GitHub and set up proper version control.

## 📋 Prerequisites

- GitHub account
- Git installed on your system
- GitHub CLI (optional but recommended)

## 🔧 Quick Setup

### Option 1: Using GitHub CLI (Recommended)

1. **Install GitHub CLI** (if not installed):
   ```bash
   # On Windows/macOS/Linux
   # Visit: https://cli.github.com/
   ```

2. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

3. **Create repository and push**:
   ```bash
   cd mobile-app
   gh repo create darul-irshad-mobile --private --description "React Native Android app for Darul Irshad Student Management System"
   git remote add origin https://github.com/yourusername/darul-irshad-mobile.git
   git push -u origin main --tags
   ```

### Option 2: Manual GitHub Setup

1. **Create new repository on GitHub**:
   - Go to https://github.com/new
   - Repository name: `darul-irshad-mobile`
   - Description: `React Native Android app for Darul Irshad Student Management System`
   - Set to **Private** (recommended for institutional projects)
   - Don't initialize with README (we already have one)

2. **Connect local repository**:
   ```bash
   cd mobile-app
   git remote add origin https://github.com/yourusername/darul-irshad-mobile.git
   git branch -M main
   git push -u origin main --tags
   ```

## 🏷️ Version Control Setup

Your repository is already configured with:

### ✅ Git Configuration
- ✅ Git repository initialized
- ✅ Initial commit created
- ✅ Version tag `v1.0.0` added
- ✅ `.gitignore` configured for React Native
- ✅ `.gitattributes` configured for proper file handling

### 📁 Repository Structure
```
mobile-app/
├── .git/                 # Git repository data
├── .gitignore           # Git ignore rules
├── .gitattributes       # Git file attributes
├── VERSION              # Current version number
├── CHANGELOG.md         # Version history
├── README.md            # Project documentation
└── src/                 # Source code
```

## 🔄 Development Workflow

### Making Changes
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make your changes...
# Add files
git add .

# Commit changes
git commit -m "Add new feature: description"

# Push branch
git push origin feature/new-feature

# Create pull request on GitHub
```

### Releasing New Versions
```bash
# Update version in package.json and VERSION file
# Update CHANGELOG.md with new changes

# Commit version changes
git add .
git commit -m "Release v1.1.0"

# Create version tag
git tag -a v1.1.0 -m "Release v1.1.0: New features and improvements"

# Push with tags
git push origin main --tags
```

## 🔒 Security Notes

- ✅ Repository is set to **Private** to protect institutional code
- ✅ Sensitive files are in `.gitignore`:
  - `android/local.properties` (local Android SDK paths)
  - `node_modules/` (dependencies)
  - `.env` files (environment variables)
  - Build artifacts

## 📊 Repository Features

Enable these GitHub features for better project management:

1. **Issues** - Track bugs and feature requests
2. **Projects** - Kanban board for task management  
3. **Actions** - CI/CD workflows (optional)
4. **Security** - Dependabot alerts
5. **Insights** - Code analysis and statistics

## 🤝 Collaboration

### Adding Team Members
1. Go to repository Settings > Manage access
2. Click "Invite a collaborator"
3. Add team members with appropriate permissions:
   - **Read**: View code only
   - **Write**: Create branches and PRs
   - **Admin**: Full repository access

### Branch Protection
Set up branch protection rules for `main`:
1. Go to Settings > Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews
   - Dismiss stale reviews
   - Require status checks

## 🚀 Next Steps

1. **Push to GitHub** using one of the methods above
2. **Set repository to private** for security
3. **Add team members** as collaborators
4. **Create development branches** for new features
5. **Set up CI/CD** for automated testing (optional)

## 📱 Building and Distribution

Your repository includes:
- ✅ Android build configuration
- ✅ Release APK generation scripts
- ✅ Version tagging system
- ✅ Comprehensive documentation

Ready for professional development and deployment! 🎉