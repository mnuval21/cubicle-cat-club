#!/bin/bash
# -----------------------------------------------
#  Cubicle Cat Club — one-line installer
#
#  curl -fsSL https://raw.githubusercontent.com/OWNER/cubicle-cat-club/main/install.sh | bash
# -----------------------------------------------

set -e

INSTALL_DIR="$HOME/.cubicle-cat-club"
REPO_URL="https://github.com/mnuva21/cubicle-cat-club.git"

echo ""
echo "  🐱 Installing Cubicle Cat Club..."
echo ""

# --- Node.js ---
if ! command -v node &> /dev/null; then
  echo "  Node.js not found — installing..."

  if [[ "$OSTYPE" == darwin* ]]; then
    if ! command -v brew &> /dev/null; then
      echo "  Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
      elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
      fi
    fi
    brew install node
  elif [[ "$OSTYPE" == linux* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "  Please install Node.js manually: https://nodejs.org"
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    echo "  Node.js installation failed. Please install manually: https://nodejs.org"
    exit 1
  fi
  echo "  Node.js $(node --version) installed!"
fi

# --- Clone or update ---
if [ -d "$INSTALL_DIR" ]; then
  echo "  Updating existing install..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo "  Downloading Cubicle Cat Club..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# --- Install, build, link ---
echo "  Installing dependencies..."
npm install

echo "  Building..."
npm run build

echo "  Setting up global command..."
npm link

echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║                                           ║"
echo "  ║    🐱 Cubicle Cat Club installed! 🐱     ║"
echo "  ║                                           ║"
echo "  ║    Just type:  cubicle-cats               ║"
echo "  ║                                           ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""
