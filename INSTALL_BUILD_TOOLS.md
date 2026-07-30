# Install Microsoft C++ Build Tools

Rust on Windows requires Microsoft C++ Build Tools to compile code.

## Option 1: Install Visual Studio Build Tools (Recommended - Smaller Download)

1. **Download Build Tools**: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

2. **Scroll down** to "All Downloads" → "Tools for Visual Studio" → "Build Tools for Visual Studio 2022"

3. **Run the installer** (vs_BuildTools.exe)

4. **Select "Desktop development with C++"** workload

5. **Click Install** (this will download ~6GB)

6. **Restart your computer** after installation

## Option 2: Install Full Visual Studio (Larger but includes IDE)

1. **Download Visual Studio Community**: https://visualstudio.microsoft.com/vs/community/

2. **Run the installer**

3. **Select "Desktop development with C++"** workload

4. **Click Install**

5. **Restart your computer** after installation

## After Installation

1. **Close all terminals**

2. **Open a new PowerShell**

3. **Navigate to project**:
   ```powershell
   cd C:\Users\Pk\Desktop\Receipta
   ```

4. **Run deployment script**:
   ```powershell
   .\deploy.ps1
   ```

## Alternative: Use WSL (Windows Subsystem for Linux)

If you prefer, you can use WSL which doesn't require Build Tools:

1. **Install WSL**:
   ```powershell
   wsl --install
   ```

2. **Restart computer**

3. **Open Ubuntu** from Start menu

4. **Install Rust in WSL**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

5. **Continue deployment in WSL**

## Quick Check

After installing Build Tools, verify it works:

```powershell
cargo --version
rustc --version
```

Then try building a simple Rust project:

```powershell
cargo new test-project
cd test-project
cargo build
```

If this works, you're ready to deploy Receipta!
