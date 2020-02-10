## FPS Manager presets

`Presets` are main part of FPS Manager functionality. Every preset is JSON formatted file with included information about settings and available behaviors.

Path for preset folder: `<modfolder>/settings/presets/`

### Vocabulary:

* `Preset` - JSON formatted file, includes `directives` and `modes`
* `Mode` - concrete set of setting
* `Directives` - service part in every `preset`. Describes started point, and events behavior.

## Load process:

### Basics:

FPS Manager must have at least 1 preset installed; if zero presets detected then mod will be not able to load, exception will be raised. By default `preset` with name `common` will be activated for `all classes`. YOU MUST KEEP THIS PRESET JUST AS FAILOVER. `Presets` must be placed  in folder `<modfolder>/settings/presets/` and have proper file names (look Naming explanation below).

If FPS Manager configured in options to support `class based presets` it will try load preset for your class firstly, after, if failed, will use `common` one.
Example: you can create custom preset for your `warrior` with custom modes, another classes will use `common` preset. 

### Naming:

FPS Manager using internal client data instead of hardcoded strings and it leads to some differences in game class naming scheme. Presets MUST HAVE names from expected preset names list.


|  Expected preset name         | Game class           |
| ------------------------------| ---------------------|

## `Preset` structure

Preset structure MUST HAVE `directives` `object` and `modes` `object`.

Simplified example below:

```JS
{
	
	"directives": {

		...
	
	},
	"modes": {

		...
	
	}
}
```

### `directives` structure

Every `directives` field except `default` can be removed or have value `false` - leads to "no jobs needed by event" state.

Value must be valid key from `modes` object.

Simplified example with explanation (WARNING: you can't place comments as below in real file).

```JS
{
	...
	"directives": {
		"default": "basicMode", //applies mode (NAME) after first login [REQUIRED]
		"triggerGuardians": "basicMode", //applies mode (NAME) as guardians detected [OPTIONAL]
		"triggerDungeons": { 
			"all": "basicMode", //applies mode (NAME) as any dungeon detected [OPTIONAL]
			"9000": "basicMode" //applies mode (NAME) as dungeon with specified id detected [OPTIONAL]
		},
		"triggerCU": "basicMode", //applies mode (NAME) as CU detected [OPTIONAL]
		"triggerBG": "basicMode", //applies mode (NAME) as battlegrounds detected [OPTIONAL]
		"triggerOW": "basicMode" //applies mode (NAME) as Open world location detected [OPTIONAL]
	}
	...

}
```

### `modes` structure

Every `modes` field explains `MODE NAME` and contains ` desired options` as object. This name can be used in in-game commands to forcefully switch mode and can be added to directives as value for options.


Value must be valid key from `modes` object.
Simplified example below: (WARNING: you can't place comments as below in real file)

```JS
{	...

	"modes": {
		"basicMode": { //mode name, can be applied in directives (look example above)
			...
		},
		"myCustomModeName" : { //custom user mode name, called with commands as example: /8 fm m myCustomModeName)
			...
		}
	}

	...
}
```

## mode structure

Every `mode` `object` in `preset` contains options for fps manager.

Detailed explanation for every option below:

```JS
{
			"throttleSomePackets": false, //blocks some packets if server spams them and they all same
			"blockCustomAppearanceChanges": false, //blocks custom appearance changes (as example marrow brooch)
			"blockUselessPackets": false, //block some unused packets which still gets send to client
			"blockAnnoyingScreenMessages": false, //block some spammy messages (as example guild quests)
			"blockNpcsDeathAnimations": false, //block animated death 
			"blockAchievementsInCombat": false, //block achievement packets while you in combat
			"blockInventoryInCombat": false, //block inventory packets while you in combat
			"blockShakeEffects": false, //block ALL shake effects 
			"blockGatherNode": false, //block useless gather nodes 
			"blockPetBaloons": false, //block pet messages 
			"blockHits": {
				"area": false, //block hits in area except you
				"me": false //block own hits effects but keep them from another players
			},
			"blockBuffs": {
				"area": false, //block all player buffs packets except your
				"huntRewards": false, //block exp/gold buffs
				"shapeChange": false, //block shape change buffs
				"effects": false //block on screen effects 
			},
			"blockNumbersPopups": {
				"hp": false, //block your hp change numbers
				"mp": false, //block your mp numbers 
				"damage": false //block damage numbers
			},
			"blockAdditionalSkillEffects": {
				"own": false, //block your skills additional effects when possible
				"players": false //block skills additional effects when possible from players near
			},
			"blockProjectiles": {
				"players": false //block players projectiles effects
			},
			"blockDropItems": {
				"all": false, //block ALL drop 
				"templateId": [] //block desired drop by templateId
			},
			"blockServants": {
				"area": false, //block servants from another players
				"me": false //block own servants
			},
			"blockSummons": {
				"me": false, //block own summons
				"area": false //block  not your summons
			},
			"blockSkills": {
				"class": [], //block skills based on class
				"rawId": [], //block all skills with desired id
				"extended": { 

				}
			},
			"blockNpcs": {
				"templateId": [], //block npc by template Is
				"huntingZoneId": [] //block npc by hunting zone
			},
			"blockPlayers": {
				"all": false, //block all players near
				"keepParty": true, //keep party members from block
				"class": [], //block by class
				"name": [] //block by name
			}
		},
		
```