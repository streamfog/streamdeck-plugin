#!/bin/bash
osascript -e 'quit app "Elgato Stream Deck"'
cp -r src/com.streamfog.main.sdPlugin /Users/kev/Library/Application\ Support/com.elgato.StreamDeck/Plugins
osascript -e 'tell application "Elgato Stream Deck" to activate'