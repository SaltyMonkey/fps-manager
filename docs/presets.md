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

FPS Manager using internal client data instead of hardcoded strings and it leads to some differences in game class naming scheme.

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
