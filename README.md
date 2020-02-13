[![Toolbox](https://img.shields.io/badge/Tera--Toolbox-latest-blueviolet)](https://github.com/tera-toolbox) ![](https://api.dependabot.com/badges/status?host=github&repo=SaltyMonkey/fps-manager) ![](https://github.com/SaltyMonkey/fps-manager/workflows/CI/badge.svg) ![](https://img.shields.io/github/license/SaltyMonkey/fps-manager)

# Current state: second beta version

# FPS Manager

FPS Manager is modern and extremely customizable module for Tera Toolbox which can help to solve annoyance by some in-game messages and fps drops.

## Overview

- Zoom zoom! (created with modern javascript without slow strings manipulations or memory leaks)
- Detailed documentation
- Readable codebase (FPS Manager developed with strict codebase styling/best practice rules and zero deprecated runtime functions)
- CI/DI (Every update verified for possible issues and manifest file generated automatically, developer notified instantly if issues detected)
- Supports latest Tera Toolbox features (be on the edge of progress :) )
- Client data usage (most of data grabbed from client instead of manual update by developer) 
- Protection from another mods (fps manager trying to catch all data before average mods and apply changes after them so nothing can affect expected result)
- Event driven ideology (setup mod one time and apply your configuration based on in-game events automatically)
- Easy start (readable options names and zero dangerous/critical options available)
- Fully clientside (FPS Manager will never send something to server)
- Class based configuration (just in-game events not enough? Enjoy custom settings combinations automatic switch based on game class)
- Shareable configuration (friend want to use your settings? It is not issue anymore. Just drag and drop them!)
- Custom modes (don't like predefined settings for configurations or they can't fit your gameplay? just rename everything or create personal configurations)
- Optional commands (commands IS OPTIONAL and can be disabled in settings)
- Interactive messages (Want to know details about mod automation decisions? Just use interactive mode)
- Manual mode with input prediction (can apply your custom mode in middle of combat EVEN IF YOU CAN'T REMEMBER EXACT MODE NAME OR LAZY TO WRITE MODE NAME FULLY)

## Features (everything is configurable)

- Throttle some repetitive packets to decrease amount of work for client
- Block some outdated/irrelevant for gameplay packets
- Block repetitive and irrelevant onscreen messages
- Block visual change packets 
- Block action scripts
- Block NPC death animation
- Block inventory packets spam in combat
- Block achievements packets spam in combat
- Block ALL shake effects
- Block gather nodes spawns
- Block hits effects
- Block buffs
- Block onscreen numbers popups
- Block damage numbers
- Block secondary skill effects when possible
- Block mystic motes explosion effect
- Block projectiles from skills
- Block drop items
- Block servants
- Block summons
- Block skills visuals
- Block npc entities
- Block players

## FAQ

Q: Why this mod do not allow change settings individually?
A: I can agree, for newbie preset based idea can be slightly harder at start to understand but in long run it allows forget about quadrillion commands.

Q: I don't want to use automatic presets. Can i just switch them manually?
A: Yes

Q: Why some features missing compared to fps utils?
A: I believe they are useless ones :)

Q: Can i use this mod with fps utils?
A: Theoretically you can but i can't recommend this.

Q: I tried to edit presets and errors everywhere :(
A: Presets must be in JSON format without comments

## Installation

### [Installation guide](https://github.com/SaltyMonkey/fps-manager/wiki/Installation-guide)

## Usage

### [Wiki](https://github.com/SaltyMonkey/fps-manager/wiki)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Credits 

- [Caali](https://github.com/caali-hackerman) for Toolbox features and help with understanding how Tera works
- [Kasea](https://github.com/Kaseaa) for his fps booster memes and working ideas behind it
- [HugeDong69](https://github.com/codeagon) for his bad code in fps utils which just works (still idk how)
- [Risenio](https://github.com/Risenio) for his packets logs so i was able code without login to Tera
