# VoiceOS Usage Flows - Complete Examples

## 🚀 Quick Start Examples

### Voice Interaction Examples

#### Simple System Control
```bash
# Start VoiceOS
docker-compose up -d
docker-compose exec voiceos python main.py --mode voice

# Voice commands:
"open chrome"                    # Opens Chrome browser
"type hello world"              # Types text in active window
"switch window"                 # Switches to next window
"close notepad"                 # Closes Notepad application
"screenshot"                    # Takes screenshot
```

#### Complex AI Tasks
```bash
# Research tasks
"research machine learning trends"
"analyze latest AI news"
"summarize quantum computing"

# Development tasks
"write python function for fibonacci"
"create web scraper for news"
"debug this python code"

# Data analysis tasks
"analyze sales_data.csv"
"process the survey results"
"find patterns in user_behavior.csv"
```

### CLI Interaction Examples

#### Basic CLI Commands
```bash
# Start CLI mode
docker-compose exec voiceos python main.py --mode cli

# CLI interaction
VoiceOS> help
VoiceOS> status
VoiceOS> metrics
VoiceOS> open chrome
VoiceOS> research reinforcement learning
VoiceOS> quit
```

#### Hybrid Mode (Voice + CLI)
```bash
# Start hybrid mode (default)
docker-compose exec voiceos python main.py

# Switch between modes
VoiceOS> voice          # Switch to voice-only
VoiceOS> cli            # Switch to CLI-only
VoiceOS> hybrid         # Switch back to hybrid

# Voice commands work while CLI is active
VoiceOS> "open firefox"
VoiceOS> "research neural networks"
```

## 🎯 Complete Workflows

### Workflow 1: Research and Analysis
```bash
# Step 1: Start VoiceOS
docker-compose exec voiceos python main.py

# Step 2: Research topic (Voice)
You: "research latest developments in quantum computing"

# Step 3: Agent performs research automatically
# - Creates researcher agent
# - Searches web for information
# - Extracts and summarizes content
# - Provides comprehensive analysis

# Step 4: Follow-up questions
You: "what are the practical applications?"
You: "summarize the key findings"
You: "create a report on this topic"
```

### Workflow 2: Code Development
```bash
# Step 1: Start VoiceOS
docker-compose exec voiceos python main.py

# Step 2: Request code development (Voice)
You: "write a python function to analyze stock data"

# Step 3: Developer agent creates code
# - Creates developer agent
# - Writes clean, documented Python code
# - Includes error handling and testing
# - Provides usage examples

# Step 4: Refinement
You: "add error handling for missing data"
You: "create unit tests for this function"
You: "optimize for performance"
```

### Workflow 3: Data Analysis
```bash
# Step 1: Prepare data
# Place CSV file in workspace directory
echo "name,age,salary
John,25,50000
Jane,30,60000
Bob,35,70000" > workspace/employee_data.csv

# Step 2: Start analysis (CLI)
docker-compose exec voiceos python main.py --mode cli
VoiceOS> analyze workspace/employee_data.csv

# Step 3: Analyst agent processes data
# - Reads and validates CSV data
# - Performs statistical analysis
# - Identifies patterns and trends
# - Generates insights and recommendations

# Step 4: Follow-up analysis
VoiceOS> "what's the average salary by age group?"
VoiceOS> "create visualization of salary distribution"
VoiceOS> "identify outliers in the data"
```

### Workflow 4: System Automation
```bash
# Step 1: Start VoiceOS
docker-compose exec voiceos python main.py

# Step 2: System control (Voice)
You: "open notepad"
You: "type meeting notes from today"
You: "save file as meeting_notes.txt"
You: "open chrome"
You: "search for project management tools"

# Step 3: Multi-step automation
You: "create daily report script"
# Agent creates script that:
# - Opens applications
# - Gathers data
# - Compiles report
# - Saves to file
```

## 🔧 Advanced Usage

### Custom Agent Creation
```bash
# Create custom agent role
mkdir -p agents/roles/custom_agent
echo "name: Custom Agent
description: Specialized for specific task
role: custom_agent
tools:
  - web_search
  - data_processor" > agents/roles/custom_agent/agent.yaml

# Use custom agent
VoiceOS> "create custom agent for my specific task"
```

### System Integration
```bash
# File operations
VoiceOS> "read config.json"
VoiceOS> "edit config.json add new setting"
VoiceOS> "create backup of important files"

# Application control
VoiceOS> "open vscode"
VoiceOS> "focus vscode"
VoiceOS> "type print('Hello World')"
VoiceOS> "save file as hello.py"
```

### Multi-Agent Collaboration
```bash
# Complex task requiring multiple agents
VoiceOS> "research AI trends and create a presentation"

# System automatically:
# 1. Creates researcher agent for research
# 2. Creates analyst agent for data processing
# 3. Creates developer agent for presentation code
# 4. Coordinates between agents
# 5. Combines results into final output
```

## 📊 Performance Monitoring

### Real-time Monitoring
```bash
# Check system status
docker-compose exec voiceos python main.py --status

# Monitor performance
VoiceOS> metrics
VoiceOS> status

# View detailed logs
docker-compose logs -f voiceos
```

### Performance Optimization
```bash
# Monitor resource usage
docker stats voiceos

# Check agent performance
VoiceOS> "show agent execution times"
VoiceOS> "analyze system bottlenecks"
```

## 🔒 Security and Safety

### Permission Management
```bash
# All system operations require permission
VoiceOS> "delete system files"
# System asks: "This operation requires permission. Allow? [y/N]"

# Security monitoring
VoiceOS> "show security log"
VoiceOS> "list blocked operations"
```

### Safe Execution
```bash
# File operations are sandboxed
VoiceOS> "read /etc/passwd"
# System blocks: "Access outside workspace not allowed"

# Dangerous operations require explicit approval
VoiceOS> "format hard drive"
# System blocks: "Dangerous operation not permitted"
```

## 🐳 Docker Operations

### Container Management
```bash
# Start system
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs voiceos

# Stop system
docker-compose down

# Rebuild with changes
docker-compose up --build
```

### Data Persistence
```bash
# Backup workspace
docker cp voiceos:/app/workspace ./backup/

# Restore workspace
docker cp ./backup/ voiceos:/app/workspace/

# Access container shell
docker-compose exec voiceos bash
```

## 🧪 Testing and Development

### System Testing
```bash
# Run system tests
docker-compose exec voiceos python main.py --test

# Test specific components
docker-compose exec voiceos python -c "from agents.core.planner import Planner; print('Planner OK')"

# Performance benchmarks
docker-compose exec voiceos python tests/test_framework.py
```

### Development Workflow
```bash
# Make changes to code
vim agents/roles/researcher/prompt.txt

# Restart container with changes
docker-compose restart voiceos

# Test changes
docker-compose exec voiceos python main.py --test
```

## 🚨 Troubleshooting

### Common Issues
```bash
# Audio not working
docker-compose exec voiceos ls -la /dev/snd
docker-compose exec voiceos aplay /usr/share/sounds/alsa/Front_Center.wav

# Permission issues
docker-compose exec voiceos ls -la workspace/
sudo chown -R $USER:$USER workspace/

# Memory issues
docker stats voiceos
# Edit docker-compose.yml to increase memory limit
```

### Debug Mode
```bash
# Enable debug logging
VOICEOS_ENV=development docker-compose up

# View detailed logs
docker-compose logs --tail=100 voiceos

# Interactive debugging
docker-compose exec voiceos python -c "import pdb; pdb.set_trace()"
```

## 📈 Scaling and Production

### Production Deployment
```bash
# Use production configuration
VOICEOS_ENV=production docker-compose -f docker-compose.prod.yml up -d

# Monitor with health checks
docker-compose exec voiceos python main.py --status

# Scale services
docker-compose up --scale voiceos=3
```

### Performance Tuning
```bash
# Optimize for specific workloads
# Edit config/voiceos.yaml for production settings
# Adjust memory and CPU limits in docker-compose.yml
# Enable performance monitoring
```

## 🎯 Best Practices

### Voice Interaction
- Speak clearly and concisely
- Use specific commands for better results
- Allow time for agent processing
- Use follow-up questions for refinement

### CLI Interaction
- Use help command to explore capabilities
- Check status before complex operations
- Use mode switching for optimal interaction
- Monitor system performance regularly

### System Management
- Regularly backup workspace and memory
- Monitor resource usage
- Update configurations as needed
- Use Docker for consistent environments

### Development
- Test changes in development environment first
- Use version control for configuration changes
- Monitor logs for errors and performance issues
- Document custom agents and tools

These examples demonstrate the full capabilities of VoiceOS as a complete voice + CLI driven multi-agent operating system with safe system control, dynamic agent creation, and comprehensive AI capabilities.
