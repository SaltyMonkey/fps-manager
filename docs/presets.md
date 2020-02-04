## FPS Manager presets

`Presets` are main part of FPS Manager functionality. Every preset is JSON formatted file with included information about settings and available behaviors.

Path for preset folder: `<modfolder>/settings/presets/`

### Vocabulary:

* `Preset` - JSON formatted file, includes `directives` and `modes`
* `Mode` - concrete set of setting
* `Directives` - service part in every `preset`. Describes started point, and events behavior.

## `Preset` structure

Preset structure MUST HAVE `directives` `object` and `modes` `object`.

Simplified example below:

```json
{
	
	"directives": {

		...
	
	},
	"modes": {

		...
	
	}
}
```

### `directives` object fields

Every `directives` field except `default` can be removed or have value `false` - leads to "no jobs needed by event" state.

Value must be valid key from `modes` object.

Simplified example with explanation (WARNING: you can't place comments as below in real file).

```json
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

### `modes` object fields

Every `modes` field explains `MODE NAME` and contains ` desired options` as object. This name can be used in in-game commands to forcefully switch mode and can be added to directives as value for options.


Value must be valid key from `modes` object.
Simplified example below: (WARNING: you can't place comments as below in real file)

```JSON
{	...

	"modes": {
		"basicMode": { //mode name, can be applied in directives (look example above)
			...
		},
		"myCustomModeName" : { //custom user mode name, can be applied in directives (look example above) or called with commands (as example: /8 fm m myCustomModeName)
			...
		}
	}

	...
}
```
