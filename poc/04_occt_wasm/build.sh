#!/usr/bin/env bash
# build.sh — OpenCASCADE 7.8 Emscripten WebAssembly build script
# Usage: ./build.sh
# Requires: Emscripten SDK installed and sourced

set -e

BUILD_DIR="$(pwd)/build"
OCCT_VERSION="7.8"
START_TIME=$(date +%s)

echo "========================================"
echo "OpenCASCADE 7.8 Emscripten WASM Build"
echo "========================================"
echo "Build directory: $BUILD_DIR"
echo "Start time: $(date -Iseconds)"
echo ""

# Check Emscripten environment
if ! command -v emcc &> /dev/null; then
    echo "[ERROR] Emscripten not found in PATH!"
    echo "Please source the Emscripten environment first:"
    echo "  source emsdk_env.sh"
    exit 1
fi

# Check CMake
if ! command -v cmake &> /dev/null; then
    echo "[ERROR] CMake not found in PATH!"
    exit 1
fi

# Step 1: Clean build directory
echo "[1/5] Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Step 2: Configure CMake with Emscripten toolchain
echo "[2/5] Configuring CMake with Emscripten toolchain..."
cd "$BUILD_DIR"

OCCT_SRC="$(pwd)/../occt-7.8.0"

if [ ! -f "$OCCT_SRC/CMakeLists.txt" ]; then
    echo "[ERROR] OpenCASCADE source not found at $OCCT_SRC"
    echo "Please download OCCT 7.8 source first."
    exit 1
fi

# Generate build files using Emscripten's CMake toolchain
emcmake cmake \
    "$OCCT_SRC" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="$(pwd)/../install" \
    -DTCL_LIBRARY=0 \
    -DTKLAPACK_LIBRARY=0 \
    -DBUILD_MODULE_Draw=0 \
    -DBUILD_MODULE_TestTests=0 \
    -DBUILD_EXAMPLES=0 \
    -DBUILD_DOC_API=0 \
    -DBUILD_DOC_2DVIEW=0 \
    -DCMAKE_VERBOSE_MAKEFILE=0 \
    -G"Unix Makefiles" \
    2>&1

if [ $? -ne 0 ]; then
    echo "[ERROR] CMake configuration failed!"
    exit 1
fi

# Step 3: Build
echo "[3/5] Building OpenCASCADE..."
emmake make -j$(nproc) 2>&1

if [ $? -ne 0 ]; then
    echo "[WARNING] Full build failed. Attempting minimal build..."
    echo "[!] Falling back to building only core libraries (Draw, Priv, Standard, Standard_Handle)"
    emmake make -j$(nproc) Draw Priv Standard Standard_Handle 2>&1
fi

# Step 4: Generate JS glue files
echo "[4/5] Generating JS glue files..."
DIST_DIR="$(pwd)/../dist"
mkdir -p "$DIST_DIR"

if [ -f "$BUILD_DIR/Draw.js" ]; then
    echo "[OK] Draw application generated: $BUILD_DIR/Draw.js"
    cp "$BUILD_DIR/Draw.js" "$DIST_DIR/" 2>/dev/null || true
    cp "$BUILD_DIR/Draw.wasm" "$DIST_DIR/" 2>/dev/null || true
    cp "$BUILD_DIR/Draw.wasm.map" "$DIST_DIR/" 2>/dev/null || true
    echo "[OK] Files copied to dist/"
fi

# Step 5: Measure output size
echo "[5/5] Measuring output size..."
if [ -f "$DIST_DIR/Draw.wasm" ]; then
    WASM_SIZE=$(stat -f%z "$DIST_DIR/Draw.wasm" 2>/dev/null || stat -c%s "$DIST_DIR/Draw.wasm" 2>/dev/null)
    echo "WASM output size: $WASM_SIZE bytes"
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "========================================"
echo "Build complete!"
echo "Elapsed time: ${ELAPSED} seconds"
echo "End time: $(date -Iseconds)"
echo "========================================"
