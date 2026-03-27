#!/bin/bash
# -----------------------------------------------
#  Cubicle Cat Club — one-click launcher
#  Run this from anywhere to start the cat office!
#
#  First run:  installs Node.js, builds, and
#              sets up the global "cubicle-cats" command.
#  Every run after: just starts the cat office.
# -----------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || { echo "Could not find project at $SCRIPT_DIR"; exit 1; }

# --- Step 1: Ensure Node.js is installed ---
if ! command -v node &> /dev/null; then
  echo ""
  echo "  Node.js is not installed — let me fix that!"
  echo ""

  # macOS: install via Homebrew
  if [[ "$OSTYPE" == darwin* ]]; then
    # Install Homebrew if needed
    if ! command -v brew &> /dev/null; then
      echo "  Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

      # Add brew to PATH for Apple Silicon and Intel Macs
      if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
      fi
    fi

    echo "  Installing Node.js via Homebrew..."
    brew install node

  # Linux: install via NodeSource
  elif [[ "$OSTYPE" == linux* ]]; then
    echo "  Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

  else
    echo ""
    echo "  Could not auto-install Node.js on this system."
    echo "  Please install it manually from: https://nodejs.org"
    echo ""
    exit 1
  fi

  # Verify it worked
  if ! command -v node &> /dev/null; then
    echo ""
    echo "  Node.js installation failed."
    echo "  Please install it manually from: https://nodejs.org"
    echo ""
    exit 1
  fi

  echo ""
  echo "  Node.js $(node --version) installed!"
  echo ""
fi

# --- Step 2: Install dependencies if needed ---
if [ ! -d "node_modules" ]; then
  echo "  First run — installing dependencies..."
  npm install
fi

# --- Step 3: Build if needed ---
if [ ! -f "packages/server/dist/cli.js" ]; then
  echo "  Building project..."
  npm run build
fi

# --- Step 4: Set up global command if not already linked ---
if ! command -v cubicle-cats &> /dev/null; then
  echo "  Setting up the 'cubicle-cats' global command..."
  npm link
  echo ""
  echo "  Done! From now on you can just type: cubicle-cats"
  echo ""
fi

# --- Step 5: Launch ---
echo ""
echo "  Starting Cubicle Cat Club..."
echo ""
npm run mock -- "$@"
