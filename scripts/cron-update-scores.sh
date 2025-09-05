#!/bin/bash

# Cron job script for updating NFL scores from ESPN API
# This script runs the ESPN score update and then the scoring script

# Set the working directory to the project root
cd "/Users/kevinmcdonough/Documents/App Playground/betting app"

# Set up logging
LOG_FILE="logs/cron-update-$(date +%Y%m%d).log"
mkdir -p logs

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting automated score update..."

# Run the ESPN score update
log "Updating scores from ESPN API..."
node scripts/update-scores-from-espn.js >> "$LOG_FILE" 2>&1
ESPN_EXIT_CODE=$?

if [ $ESPN_EXIT_CODE -eq 0 ]; then
    log "ESPN score update completed successfully"
    
    # Run the scoring script
    log "Running pick scoring..."
    node scripts/score-picks.js >> "$LOG_FILE" 2>&1
    SCORING_EXIT_CODE=$?
    
    if [ $SCORING_EXIT_CODE -eq 0 ]; then
        log "Pick scoring completed successfully"
    else
        log "ERROR: Pick scoring failed with exit code $SCORING_EXIT_CODE"
    fi
else
    log "ERROR: ESPN score update failed with exit code $ESPN_EXIT_CODE"
fi

log "Automated score update finished"
