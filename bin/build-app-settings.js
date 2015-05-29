#!/usr/bin/env node

'use strict';

var cordovaLib = 'cordova';
var configParserLib = 'ConfigParser';

try {
	var cordova_util = require (cordovaLib + '/src/util');
} catch (e) {
	cordovaLib = 'cordova/node_modules/cordova-lib';
	configParserLib = 'configparser/ConfigParser';
	cordova_util = require (cordovaLib + '/src/cordova/util');
}

var projectRoot = cordova_util.isCordova(process.cwd());
var projectXml = cordova_util.projectConfig(projectRoot);
var configParser = cordova_util.config_parser || cordova_util.configparser;

if (!configParser) {
	var configParser = require(cordovaLib + '/src/' + configParserLib);
}
var projectConfig = new configParser(projectXml);

// console.log (projectConfig.name(), projectConfig.packageName());



var path    = require('path');
var fs      = require('fs');
var plist   = require('plist');
var libxml  = require('libxmljs');

function ucfirst(s) {
	return s.charAt(0).toUpperCase() + s.substring(1);
}

function SettingsGenerator () {

	var config = {
		ios: {
			root: "PreferenceSpecifiers",
		},
		types: {
			group: {
				iosType: "PSGroupSpecifier",
				androidType: "PreferenceCategory"
			},
			select: {
				iosType: "PSMultiValueSpecifier",
				androidType: "MultiSelectListPreference"
			},
			radio: {
				iosType: "PSRadioGroupSpecifier",
				androidType: "ListPreference"
			},
			toggle: {
				iosType: "PSToggleSwitchSpecifier",
				androidType: "SwitchPreference",
				types: "boolean",
			},
			text: {
				iosType: "PSTextFieldSpecifier",
				androidType: "EditTextPreference",
				types: "string",
//				IsSecure
//				KeyboardType (Alphabet , NumbersAndPunctuation , NumberPad , URL , EmailAddress)
//				AutocapitalizationType
//				AutocorrectionType
			},
			slider: {
				iosType: "PSSliderSpecifier",
				types: "float",
				// NO TITLE
//				DefaultValue
//				MinimumValue
//				MaximumValue
			}

		}

	};

	return
}

function configMap (config) {
// iOS
// https://developer.apple.com/library/ios/documentation/cocoa/Conceptual/UserDefaults/Preferences/Preferences.html
/*

mkdir Settings.bundle
cd Settings.bundle
touch Root.plist
mkdir en.lproj
cd en.lproj
touch Root.strings

Identifier

PSGroupSpecifier
Type
Title
FooterText

PSToggleSwitchSpecifier
Title
Key
DefaultValue

PSSliderSpecifier
Key
DefaultValue
MinimumValue
MaximumValue

PSTitleValueSpecifier
Title
Key
DefaultValue

PSTextFieldSpecifier
Title
Key
DefaultValue
IsSecure
KeyboardType (Alphabet , NumbersAndPunctuation , NumberPad , URL , EmailAddress)
AutocapitalizationType
AutocorrectionType

PSMultiValueSpecifier
Title
Key
DefaultValue
Values
Titles

PSRadioGroupSpecifier
Title
FooterText???
Key
DefaultValue
Values
Titles


*/

	// http://developer.android.com/guide/topics/ui/settings.html
	// http://stackoverflow.com/questions/4990529/android-a-good-looking-standard-settings-menu
	// http://androidpartaker.wordpress.com/2010/07/11/android-preferences/

	/*

<?xml version="1.0" encoding="utf-8"?>
<PreferenceScreen xmlns:android="http://schemas.android.com/apk/res/android">
	<PreferenceCategory android:title="Main">
		<CheckBoxPreference android:title="Enable Preferences"
			android:key="EnablePreferences" android:summary="Check to enable Other Preferences" />
	</PreferenceCategory>
	<PreferenceCategory android:title="Other Prefernces">
		<ListPreference android:title="List Preference"
			android:key="DayOfWeek" android:dependency="EnablePreferences"
			android:summary="Selec Day of the Week" android:entries="@array/daysOfWeek"
			android:entryValues="@array/daysOfWeekValues" />
		<EditTextPreference android:title="Edit Text Preference"
			android:key="Name" android:dependency="EnablePreferences"
			android:summary="Enter Your Name" android:dialogTitle="Enter Your Name"
			android:defaultValue="Android Partaker"/>
		<RingtonePreference android:title="Ringtone Preference"
			android:key="Ringtone" android:dependency="EnablePreferences"
			android:summary="Select Ringtone" android:ringtoneType="all" />
	</PreferenceCategory>

	<PreferenceCategory android:title="Advance Preference">
		<PreferenceScreen android:title="Advance Preference">

			<EditTextPreference android:title="Enter Text"
				android:key="Text" />
		</PreferenceScreen>
	</PreferenceCategory>
</PreferenceScreen>

*/


	if (config.type) {

		if (config.type == 'group') {
			config.type = 'PSGroupSpecifier';
		}
		else {
			config.DefaultValue = config['default'];
			delete config['default'];

			config.Key = config.name;
			delete config['name'];

			switch (config.type) {

				case 'textfield':
					config.type = 'PSTextFieldSpecifier';
					break;

				case 'switch':
					config.type = 'PSToggleSwitchSpecifier';
					break;

				case 'combo':
					config.type = 'PSMultiValueSpecifier';

					config.titles = [];
					config.values = [];
					config.items.forEach(function(a) {
						config.values.push(a.id || a.value);
						config.titles.push(a.title || a.name);
					});
					delete config.items;
					break;
			}
		}
	}

	Object.keys(config).forEach(function(k) {
		var uc = ucfirst(k);
		config[uc] = config[k];
		if (uc !== k) {
			delete config[k];
		}
	})

	return config;
}

// guide for windows: http://blogs.msdn.com/b/glengordon/archive/2012/09/17/managing-settings-in-windows-phone-and-windows-8-store-apps.aspx

fs.readFile('app-settings.json', function(err, data) {
	if (err) {
		console.error ('you must write your preferences meta in app-settings.json in order to work');
		throw err;
	}

	var iosData = JSON.parse (data);
	var aData   = JSON.parse (data);

	// build iOS settings bundle

	var items = [];
	while (iosData.length) {
		var src = iosData.shift();
		if (src.type === 'group') {
			src.items.reverse().forEach(function(s) {
				iosData.unshift(s);
			});
			delete src.items;
		}
		items.push (configMap(src));
	}

	var plistXml = plist.build({ PreferenceSpecifiers: items });
	fs.exists('platforms/ios', function(exists) {
		if (!exists) {
			console.error('platform ios not found');
			return;
		}

		fs.mkdir('platforms/ios/Settings.bundle', function(e) {
			if (e && e.code !== 'EEXIST') {
				throw e;
			}

			// Write settings plist
			fs.writeFile('platforms/ios/Settings.bundle/Root.plist', plistXml, function(err) {
				if (err) {
					throw err;
				}
				console.log('ios settings bundle was successfully generated');
			});

			// Write localization resource file
			fs.mkdir('platforms/ios/Settings.bundle/en.lproj', function(e) {
				if (e && e.code != 'EEXIST') {
					throw e;
				}
				fs.writeFile('platforms/ios/Settings.bundle/en.lproj/Root.strings', '/* */', function(err) {
					if (err) {
						throw err;
					}
				});
			});
		});
	});



	// build Android settings XML

	var doc = new libxml.Document();
	var strings = [];
	var n = doc
		.node('PreferenceScreen')
		.attr({'xmlns:android': 'http://schemas.android.com/apk/res/android'});


	var addSettings = function(parent, config) {
		if (config.type == 'group') {
			var g = parent
				.node('PreferenceCategory')
				.attr({'android:title': config.name || config.title});

			config.items.forEach(function(item) {
				addSettings(g, item);
			});

		} else {

			var attr = {
				'android:title': config.title,
				'android:key': config.name,
				'android:defaultValue': config['default']
			}

			switch (config.type) {
				case 'combo':
					// Generate resource file
					var d = new libxml.Document();
					var res = d.node('resources');
					var titles = res.node('string-array').attr({name: config.name}),
						values = res.node('string-array').attr({name: config.name + 'Values'});

					config.items.forEach(function(item) {
						titles.node('item', item.name || item.title);
						values.node('item', item.id || item.value);
					});

					strings.push({
						name: config.name,
						xml: d.toString()
					});

					attr['android:entries'] = '@array/' + config.name;
					attr['android:entryValues'] = '@array/' + config.name + 'Values';

					parent
						.node('ListPreference')
						.attr(attr)
					break;
				case 'switch':
					// Generate resource file

					// TODO: title must be localizable
					// attr['android:title'] = '@string/' + config.name;

					// var d = new libxml.Document();
					// var res = d.node('resources');
					// var title = res.node('string').attr({name: config.name});

					// strings.push({
					//	name: config.name,
					//	xml: d.toString()
					// });

					parent
						.node('SwitchPreference')
						.attr(attr)
					break;
				case 'textfield':
					// Generate resource file

					// TODO: title must be localizable
					// attr['android:title'] = '@string/' + config.name;

					// var d = new libxml.Document();
					// var res = d.node('resources');
					// var title = res.node('string').attr({name: config.name});

					// strings.push({
					//	name: config.name,
					//	xml: d.toString()
					// });

					parent
						.node('EditTextPreference')
						.attr(attr)
					break;

			}
		}
	}
	aData.forEach(function(item) {
		addSettings(n, item);
	});


	fs.exists('platforms/android', function(exists) {
		if (!exists) {
			console.error('platform android not found');
			return;
		}

		fs.mkdir('platforms/android/res/xml', function(e) {
			if (e && e.code !== 'EEXIST') {
				throw e;
			}

			// Write settings plist
			fs.writeFile('platforms/android/res/xml/apppreferences.xml', doc.toString(), function(err) {
				if (err) {
					throw err;
				}
				console.log('android preferences file was successfully generated');
			});

			// Write localization resource file
			fs.mkdir('platforms/android/res/values', function(e) {
				if (e && e.code != 'EEXIST') {
					throw e;
				}
				strings.forEach(function(file) {
					fs.writeFile('platforms/android/res/values/' + file.name + '.xml', file.xml, function(err) {
						if (err) {
							throw err;
						}
					});
				});
			});

			// no error handling, sorry
			var rs = fs.createReadStream (path.resolve (__dirname, '../src/android/AppPreferencesActivity.template'));
			var androidPackagePath = "me.apla.cordova".replace (/\./g, '/');
			var activityFileName= path.join ('platforms/android/src', androidPackagePath, 'AppPreferencesActivity.java')
			var ws = fs.createWriteStream (activityFileName);
			ws.write ("package me.apla.cordova;\n\n");
			ws.write ('import ' + projectConfig.packageName() + ".R;\n\n");
			rs.pipe (ws);

			console.log ('you must insert following xml node into <application> section of your Manifest:');
			console.log ('<activity android:name="me.apla.cordova.AppPreferencesActivity"></activity>');
		});
	});

});
