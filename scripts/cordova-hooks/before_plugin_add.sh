#!/bin/bash

# Cross-platform hook to build cordova-plugin-moodleapp before adding the plugin.
# Uses npx cross-env to set NODE_ENV on Windows environments where 'VAR=val' syntax fails.
if [[ $CORDOVA_PLUGINS == *cordova-plugin-moodleapp* ]]; then
    echo "Building cordova-plugin-moodleapp"

    # If npx is available, prefer running the build via cross-env to ensure NODE_ENV is set
    if command -v npx >/dev/null 2>&1; then
        npx cross-env NODE_ENV=production node cordova-plugin-moodleapp/scripts/build.js || exit 1
    else
        # Fallback: run node build script directly (assumes environment will set NODE_ENV appropriately)
        node cordova-plugin-moodleapp/scripts/build.js || exit 1
    fi
fi
