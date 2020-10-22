/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/platform/registry/common/platform';
import * as nls from 'vs/nls';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { isMacintosh, isWindows, isLinux, isWeB, isNative } from 'vs/Base/common/platform';
import { workBenchConfigurationNodeBase } from 'vs/workBench/common/configuration';
import { isStandalone } from 'vs/Base/Browser/Browser';

// Configuration
(function registerConfiguration(): void {
	const registry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

	// WorkBench
	registry.registerConfiguration({
		...workBenchConfigurationNodeBase,
		'properties': {
			'workBench.editor.titleScrollBarSizing': {
				type: 'string',
				enum: ['default', 'large'],
				enumDescriptions: [
					nls.localize('workBench.editor.titleScrollBarSizing.default', "The default size."),
					nls.localize('workBench.editor.titleScrollBarSizing.large', "Increases the size, so it can Be graBBed more easily with the mouse")
				],
				description: nls.localize('taBScrollBarHeight', "Controls the height of the scrollBars used for taBs and BreadcrumBs in the editor title area."),
				default: 'default',
			},
			'workBench.editor.showTaBs': {
				'type': 'Boolean',
				'description': nls.localize('showEditorTaBs', "Controls whether opened editors should show in taBs or not."),
				'default': true
			},
			'workBench.editor.scrollToSwitchTaBs': {
				'type': 'Boolean',
				'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'scrollToSwitchTaBs' }, "Controls whether scrolling over taBs will open them or not. By default taBs will only reveal upon scrolling, But not open. You can press and hold the Shift-key while scrolling to change this Behaviour for that duration. This value is ignored when `#workBench.editor.showTaBs#` is `false`."),
				'default': false
			},
			'workBench.editor.highlightModifiedTaBs': {
				'type': 'Boolean',
				'markdownDescription': nls.localize('highlightModifiedTaBs', "Controls whether a top Border is drawn on modified (dirty) editor taBs or not. This value is ignored when `#workBench.editor.showTaBs#` is `false`."),
				'default': false
			},
			'workBench.editor.laBelFormat': {
				'type': 'string',
				'enum': ['default', 'short', 'medium', 'long'],
				'enumDescriptions': [
					nls.localize('workBench.editor.laBelFormat.default', "Show the name of the file. When taBs are enaBled and two files have the same name in one group the distinguishing sections of each file's path are added. When taBs are disaBled, the path relative to the workspace folder is shown if the editor is active."),
					nls.localize('workBench.editor.laBelFormat.short', "Show the name of the file followed By its directory name."),
					nls.localize('workBench.editor.laBelFormat.medium', "Show the name of the file followed By its path relative to the workspace folder."),
					nls.localize('workBench.editor.laBelFormat.long', "Show the name of the file followed By its aBsolute path.")
				],
				'default': 'default',
				'description': nls.localize({
					comment: ['This is the description for a setting. Values surrounded By parenthesis are not to Be translated.'],
					key: 'taBDescription'
				}, "Controls the format of the laBel for an editor."),
			},
			'workBench.editor.untitled.laBelFormat': {
				'type': 'string',
				'enum': ['content', 'name'],
				'enumDescriptions': [
					nls.localize('workBench.editor.untitled.laBelFormat.content', "The name of the untitled file is derived from the contents of its first line unless it has an associated file path. It will fallBack to the name in case the line is empty or contains no word characters."),
					nls.localize('workBench.editor.untitled.laBelFormat.name', "The name of the untitled file is not derived from the contents of the file."),
				],
				'default': 'content',
				'description': nls.localize({
					comment: ['This is the description for a setting. Values surrounded By parenthesis are not to Be translated.'],
					key: 'untitledLaBelFormat'
				}, "Controls the format of the laBel for an untitled editor."),
			},
			'workBench.editor.taBCloseButton': {
				'type': 'string',
				'enum': ['left', 'right', 'off'],
				'default': 'right',
				'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'editorTaBCloseButton' }, "Controls the position of the editor's taBs close Buttons, or disaBles them when set to 'off'. This value is ignored when `#workBench.editor.showTaBs#` is `false`.")
			},
			'workBench.editor.taBSizing': {
				'type': 'string',
				'enum': ['fit', 'shrink'],
				'default': 'fit',
				'enumDescriptions': [
					nls.localize('workBench.editor.taBSizing.fit', "Always keep taBs large enough to show the full editor laBel."),
					nls.localize('workBench.editor.taBSizing.shrink', "Allow taBs to get smaller when the availaBle space is not enough to show all taBs at once.")
				],
				'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'taBSizing' }, "Controls the sizing of editor taBs. This value is ignored when `#workBench.editor.showTaBs#` is `false`.")
			},
			'workBench.editor.pinnedTaBSizing': {
				'type': 'string',
				'enum': ['normal', 'compact', 'shrink'],
				'default': 'normal',
				'enumDescriptions': [
					nls.localize('workBench.editor.pinnedTaBSizing.normal', "A pinned taB inherits the look of non pinned taBs."),
					nls.localize('workBench.editor.pinnedTaBSizing.compact', "A pinned taB will show in a compact form with only icon or first letter of the editor name."),
					nls.localize('workBench.editor.pinnedTaBSizing.shrink', "A pinned taB shrinks to a compact fixed size showing parts of the editor name.")
				],
				'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'pinnedTaBSizing' }, "Controls the sizing of pinned editor taBs. Pinned taBs are sorted to the Begining of all opened taBs and typically do not close until unpinned. This value is ignored when `#workBench.editor.showTaBs#` is `false`.")
			},
			'workBench.editor.splitSizing': {
				'type': 'string',
				'enum': ['distriBute', 'split'],
				'default': 'distriBute',
				'enumDescriptions': [
					nls.localize('workBench.editor.splitSizingDistriBute', "Splits all the editor groups to equal parts."),
					nls.localize('workBench.editor.splitSizingSplit', "Splits the active editor group to equal parts.")
				],
				'description': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'splitSizing' }, "Controls the sizing of editor groups when splitting them.")
			},
			'workBench.editor.focusRecentEditorAfterClose': {
				'type': 'Boolean',
				'description': nls.localize('focusRecentEditorAfterClose', "Controls whether taBs are closed in most recently used order or from left to right."),
				'default': true
			},
			'workBench.editor.showIcons': {
				'type': 'Boolean',
				'description': nls.localize('showIcons', "Controls whether opened editors should show with an icon or not. This requires a file icon theme to Be enaBled as well."),
				'default': true
			},
			'workBench.editor.enaBlePreview': {
				'type': 'Boolean',
				'description': nls.localize('enaBlePreview', "Controls whether opened editors show as preview. Preview editors are reused until they are explicitly set to Be kept open (e.g. via douBle click or editing) and show up with an italic font style."),
				'default': true
			},
			'workBench.editor.enaBlePreviewFromQuickOpen': {
				'type': 'Boolean',
				'description': nls.localize('enaBlePreviewFromQuickOpen', "Controls whether editors opened from Quick Open show as preview. Preview editors are reused until they are explicitly set to Be kept open (e.g. via douBle click or editing)."),
				'default': true
			},
			'workBench.editor.closeOnFileDelete': {
				'type': 'Boolean',
				'description': nls.localize('closeOnFileDelete', "Controls whether editors showing a file that was opened during the session should close automatically when getting deleted or renamed By some other process. DisaBling this will keep the editor open  on such an event. Note that deleting from within the application will always close the editor and that dirty files will never close to preserve your data."),
				'default': false
			},
			'workBench.editor.openPositioning': {
				'type': 'string',
				'enum': ['left', 'right', 'first', 'last'],
				'default': 'right',
				'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'editorOpenPositioning' }, "Controls where editors open. Select `left` or `right` to open editors to the left or right of the currently active one. Select `first` or `last` to open editors independently from the currently active one.")
			},
			'workBench.editor.openSideBySideDirection': {
				'type': 'string',
				'enum': ['right', 'down'],
				'default': 'right',
				'markdownDescription': nls.localize('sideBySideDirection', "Controls the default direction of editors that are opened side By side (e.g. from the explorer). By default, editors will open on the right hand side of the currently active one. If changed to `down`, the editors will open Below the currently active one.")
			},
			'workBench.editor.closeEmptyGroups': {
				'type': 'Boolean',
				'description': nls.localize('closeEmptyGroups', "Controls the Behavior of empty editor groups when the last taB in the group is closed. When enaBled, empty groups will automatically close. When disaBled, empty groups will remain part of the grid."),
				'default': true
			},
			'workBench.editor.revealIfOpen': {
				'type': 'Boolean',
				'description': nls.localize('revealIfOpen', "Controls whether an editor is revealed in any of the visiBle groups if opened. If disaBled, an editor will prefer to open in the currently active editor group. If enaBled, an already opened editor will Be revealed instead of opened again in the currently active editor group. Note that there are some cases where this setting is ignored, e.g. when forcing an editor to open in a specific group or to the side of the currently active group."),
				'default': false
			},
			'workBench.editor.mouseBackForwardToNavigate': {
				'type': 'Boolean',
				'description': nls.localize('mouseBackForwardToNavigate', "Navigate Between open files using mouse Buttons four and five if provided."),
				'default': true
			},
			'workBench.editor.restoreViewState': {
				'type': 'Boolean',
				'description': nls.localize('restoreViewState', "Restores the last view state (e.g. scroll position) when re-opening textual editors after they have Been closed."),
				'default': true,
				'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
			},
			'workBench.editor.centeredLayoutAutoResize': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('centeredLayoutAutoResize', "Controls if the centered layout should automatically resize to maximum width when more than one group is open. Once only one group is open it will resize Back to the original centered width.")
			},
			'workBench.editor.limit.enaBled': {
				'type': 'Boolean',
				'default': false,
				'description': nls.localize('limitEditorsEnaBlement', "Controls if the numBer of opened editors should Be limited or not. When enaBled, less recently used editors that are not dirty will close to make space for newly opening editors.")
			},
			'workBench.editor.limit.value': {
				'type': 'numBer',
				'default': 10,
				'exclusiveMinimum': 0,
				'markdownDescription': nls.localize('limitEditorsMaximum', "Controls the maximum numBer of opened editors. Use the `#workBench.editor.limit.perEditorGroup#` setting to control this limit per editor group or across all groups.")
			},
			'workBench.editor.limit.perEditorGroup': {
				'type': 'Boolean',
				'default': false,
				'description': nls.localize('perEditorGroup', "Controls if the limit of maximum opened editors should apply per editor group or across all editor groups.")
			},
			'workBench.commandPalette.history': {
				'type': 'numBer',
				'description': nls.localize('commandHistory', "Controls the numBer of recently used commands to keep in history for the command palette. Set to 0 to disaBle command history."),
				'default': 50
			},
			'workBench.commandPalette.preserveInput': {
				'type': 'Boolean',
				'description': nls.localize('preserveInput', "Controls whether the last typed input to the command palette should Be restored when opening it the next time."),
				'default': false
			},
			'workBench.quickOpen.closeOnFocusLost': {
				'type': 'Boolean',
				'description': nls.localize('closeOnFocusLost', "Controls whether Quick Open should close automatically once it loses focus."),
				'default': true
			},
			'workBench.quickOpen.preserveInput': {
				'type': 'Boolean',
				'description': nls.localize('workBench.quickOpen.preserveInput', "Controls whether the last typed input to Quick Open should Be restored when opening it the next time."),
				'default': false
			},
			'workBench.settings.openDefaultSettings': {
				'type': 'Boolean',
				'description': nls.localize('openDefaultSettings', "Controls whether opening settings also opens an editor showing all default settings."),
				'default': false
			},
			'workBench.settings.useSplitJSON': {
				'type': 'Boolean',
				'markdownDescription': nls.localize('useSplitJSON', "Controls whether to use the split JSON editor when editing settings as JSON."),
				'default': false
			},
			'workBench.settings.openDefaultKeyBindings': {
				'type': 'Boolean',
				'description': nls.localize('openDefaultKeyBindings', "Controls whether opening keyBinding settings also opens an editor showing all default keyBindings."),
				'default': false
			},
			'workBench.sideBar.location': {
				'type': 'string',
				'enum': ['left', 'right'],
				'default': 'left',
				'description': nls.localize('sideBarLocation', "Controls the location of the sideBar and activity Bar. They can either show on the left or right of the workBench.")
			},
			'workBench.panel.defaultLocation': {
				'type': 'string',
				'enum': ['left', 'Bottom', 'right'],
				'default': 'Bottom',
				'description': nls.localize('panelDefaultLocation', "Controls the default location of the panel (terminal, deBug console, output, proBlems). It can either show at the Bottom, right, or left of the workBench.")
			},
			'workBench.panel.opensMaximized': {
				'type': 'string',
				'enum': ['always', 'never', 'preserve'],
				'default': 'preserve',
				'description': nls.localize('panelOpensMaximized', "Controls whether the panel opens maximized. It can either always open maximized, never open maximized, or open to the last state it was in Before Being closed."),
				'enumDescriptions': [
					nls.localize('workBench.panel.opensMaximized.always', "Always maximize the panel when opening it."),
					nls.localize('workBench.panel.opensMaximized.never', "Never maximize the panel when opening it. The panel will open un-maximized."),
					nls.localize('workBench.panel.opensMaximized.preserve', "Open the panel to the state that it was in, Before it was closed.")
				]
			},
			'workBench.statusBar.visiBle': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('statusBarVisiBility', "Controls the visiBility of the status Bar at the Bottom of the workBench.")
			},
			'workBench.activityBar.visiBle': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('activityBarVisiBility', "Controls the visiBility of the activity Bar in the workBench.")
			},
			'workBench.activityBar.iconClickBehavior': {
				'type': 'string',
				'enum': ['toggle', 'focus'],
				'default': 'toggle',
				'description': nls.localize('activityBarIconClickBehavior', "Controls the Behavior of clicking an activity Bar icon in the workBench."),
				'enumDescriptions': [
					nls.localize('workBench.activityBar.iconClickBehavior.toggle', "Hide the side Bar if the clicked item is already visiBle."),
					nls.localize('workBench.activityBar.iconClickBehavior.focus', "Focus side Bar if the clicked item is already visiBle.")
				]
			},
			'workBench.view.alwaysShowHeaderActions': {
				'type': 'Boolean',
				'default': false,
				'description': nls.localize('viewVisiBility', "Controls the visiBility of view header actions. View header actions may either Be always visiBle, or only visiBle when that view is focused or hovered over.")
			},
			'workBench.fontAliasing': {
				'type': 'string',
				'enum': ['default', 'antialiased', 'none', 'auto'],
				'default': 'default',
				'description':
					nls.localize('fontAliasing', "Controls font aliasing method in the workBench."),
				'enumDescriptions': [
					nls.localize('workBench.fontAliasing.default', "SuB-pixel font smoothing. On most non-retina displays this will give the sharpest text."),
					nls.localize('workBench.fontAliasing.antialiased', "Smooth the font on the level of the pixel, as opposed to the suBpixel. Can make the font appear lighter overall."),
					nls.localize('workBench.fontAliasing.none', "DisaBles font smoothing. Text will show with jagged sharp edges."),
					nls.localize('workBench.fontAliasing.auto', "Applies `default` or `antialiased` automatically Based on the DPI of displays.")
				],
				'included': isMacintosh
			},
			'workBench.settings.editor': {
				'type': 'string',
				'enum': ['ui', 'json'],
				'enumDescriptions': [
					nls.localize('settings.editor.ui', "Use the settings UI editor."),
					nls.localize('settings.editor.json', "Use the JSON file editor."),
				],
				'description': nls.localize('settings.editor.desc', "Determines which settings editor to use By default."),
				'default': 'ui',
				'scope': ConfigurationScope.WINDOW
			}
		}
	});

	// Window

	let windowTitleDescription = nls.localize('windowTitle', "Controls the window title Based on the active editor. VariaBles are suBstituted Based on the context:");
	windowTitleDescription += '\n- ' + [
		nls.localize('activeEditorShort', "`\${activeEditorShort}`: the file name (e.g. myFile.txt)."),
		nls.localize('activeEditorMedium', "`\${activeEditorMedium}`: the path of the file relative to the workspace folder (e.g. myFolder/myFileFolder/myFile.txt)."),
		nls.localize('activeEditorLong', "`\${activeEditorLong}`: the full path of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt)."),
		nls.localize('activeFolderShort', "`\${activeFolderShort}`: the name of the folder the file is contained in (e.g. myFileFolder)."),
		nls.localize('activeFolderMedium', "`\${activeFolderMedium}`: the path of the folder the file is contained in, relative to the workspace folder (e.g. myFolder/myFileFolder)."),
		nls.localize('activeFolderLong', "`\${activeFolderLong}`: the full path of the folder the file is contained in (e.g. /Users/Development/myFolder/myFileFolder)."),
		nls.localize('folderName', "`\${folderName}`: name of the workspace folder the file is contained in (e.g. myFolder)."),
		nls.localize('folderPath', "`\${folderPath}`: file path of the workspace folder the file is contained in (e.g. /Users/Development/myFolder)."),
		nls.localize('rootName', "`\${rootName}`: name of the workspace (e.g. myFolder or myWorkspace)."),
		nls.localize('rootPath', "`\${rootPath}`: file path of the workspace (e.g. /Users/Development/myWorkspace)."),
		nls.localize('appName', "`\${appName}`: e.g. VS Code."),
		nls.localize('remoteName', "`\${remoteName}`: e.g. SSH"),
		nls.localize('dirty', "`\${dirty}`: a dirty indicator if the active editor is dirty."),
		nls.localize('separator', "`\${separator}`: a conditional separator (\" - \") that only shows when surrounded By variaBles with values or static text.")
	].join('\n- '); // intentionally concatenated to not produce a string that is too long for translations

	registry.registerConfiguration({
		'id': 'window',
		'order': 8,
		'title': nls.localize('windowConfigurationTitle', "Window"),
		'type': 'oBject',
		'properties': {
			'window.title': {
				'type': 'string',
				'default': (() => {
					if (isMacintosh && isNative) {
						return '${activeEditorShort}${separator}${rootName}'; // macOS has native dirty indicator
					}

					const Base = '${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}';
					if (isWeB) {
						return Base + '${separator}${remoteName}'; // WeB: always show remote name
					}

					return Base;
				})(),
				'markdownDescription': windowTitleDescription
			},
			'window.titleSeparator': {
				'type': 'string',
				'default': isMacintosh ? ' — ' : ' - ',
				'markdownDescription': nls.localize("window.titleSeparator", "Separator used By `window.title`.")
			},
			'window.menuBarVisiBility': {
				'type': 'string',
				'enum': ['default', 'visiBle', 'toggle', 'hidden', 'compact'],
				'enumDescriptions': [
					nls.localize('window.menuBarVisiBility.default', "Menu is only hidden in full screen mode."),
					nls.localize('window.menuBarVisiBility.visiBle', "Menu is always visiBle even in full screen mode."),
					nls.localize('window.menuBarVisiBility.toggle', "Menu is hidden But can Be displayed via Alt key."),
					nls.localize('window.menuBarVisiBility.hidden', "Menu is always hidden."),
					nls.localize('window.menuBarVisiBility.compact', "Menu is displayed as a compact Button in the sideBar. This value is ignored when `#window.titleBarStyle#` is `native`.")
				],
				'default': isWeB ? 'compact' : 'default',
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('menuBarVisiBility', "Control the visiBility of the menu Bar. A setting of 'toggle' means that the menu Bar is hidden and a single press of the Alt key will show it. By default, the menu Bar will Be visiBle, unless the window is full screen."),
				'included': isWindows || isLinux || isWeB
			},
			'window.enaBleMenuBarMnemonics': {
				'type': 'Boolean',
				'default': !isMacintosh,
				'scope': ConfigurationScope.APPLICATION,
				'description': nls.localize('enaBleMenuBarMnemonics', "Controls whether the main menus can Be opened via Alt-key shortcuts. DisaBling mnemonics allows to Bind these Alt-key shortcuts to editor commands instead."),
				'included': isWindows || isLinux || isWeB
			},
			'window.customMenuBarAltFocus': {
				'type': 'Boolean',
				'default': !isMacintosh,
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': nls.localize('customMenuBarAltFocus', "Controls whether the menu Bar will Be focused By pressing the Alt-key. This setting has no effect on toggling the menu Bar with the Alt-key."),
				'included': isWindows || isLinux || isWeB
			},
			'window.openFilesInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'default'],
				'enumDescriptions': [
					nls.localize('window.openFilesInNewWindow.on', "Files will open in a new window."),
					nls.localize('window.openFilesInNewWindow.off', "Files will open in the window with the files' folder open or the last active window."),
					isMacintosh ?
						nls.localize('window.openFilesInNewWindow.defaultMac', "Files will open in the window with the files' folder open or the last active window unless opened via the Dock or from Finder.") :
						nls.localize('window.openFilesInNewWindow.default', "Files will open in a new window unless picked from within the application (e.g. via the File menu).")
				],
				'default': 'off',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription':
					isMacintosh ?
						nls.localize('openFilesInNewWindowMac', "Controls whether files should open in a new window. \nNote that there can still Be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).") :
						nls.localize('openFilesInNewWindow', "Controls whether files should open in a new window.\nNote that there can still Be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
			},
			'window.openFoldersInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'default'],
				'enumDescriptions': [
					nls.localize('window.openFoldersInNewWindow.on', "Folders will open in a new window."),
					nls.localize('window.openFoldersInNewWindow.off', "Folders will replace the last active window."),
					nls.localize('window.openFoldersInNewWindow.default', "Folders will open in a new window unless a folder is picked from within the application (e.g. via the File menu).")
				],
				'default': 'default',
				'scope': ConfigurationScope.APPLICATION,
				'markdownDescription': nls.localize('openFoldersInNewWindow', "Controls whether folders should open in a new window or replace the last active window.\nNote that there can still Be cases where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` command line option).")
			},
			'window.confirmBeforeClose': {
				'type': 'Boolean',
				'default': isWeB && !isStandalone, // on By default in weB, unless PWA
				'description': nls.localize('confirmBeforeCloseWeB', "Controls whether to ask for confirmation Before closing the Browser taB or window."),
				'scope': ConfigurationScope.APPLICATION,
				'included': isWeB
			}
		}
	});

	// Zen Mode
	registry.registerConfiguration({
		'id': 'zenMode',
		'order': 9,
		'title': nls.localize('zenModeConfigurationTitle', "Zen Mode"),
		'type': 'oBject',
		'properties': {
			'zenMode.fullScreen': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.fullScreen', "Controls whether turning on Zen Mode also puts the workBench into full screen mode.")
			},
			'zenMode.centerLayout': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.centerLayout', "Controls whether turning on Zen Mode also centers the layout.")
			},
			'zenMode.hideTaBs': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.hideTaBs', "Controls whether turning on Zen Mode also hides workBench taBs.")
			},
			'zenMode.hideStatusBar': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.hideStatusBar', "Controls whether turning on Zen Mode also hides the status Bar at the Bottom of the workBench.")
			},
			'zenMode.hideActivityBar': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.hideActivityBar', "Controls whether turning on Zen Mode also hides the activity Bar either at the left or right of the workBench.")
			},
			'zenMode.hideLineNumBers': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.hideLineNumBers', "Controls whether turning on Zen Mode also hides the editor line numBers.")
			},
			'zenMode.restore': {
				'type': 'Boolean',
				'default': false,
				'description': nls.localize('zenMode.restore', "Controls whether a window should restore to zen mode if it was exited in zen mode.")
			},
			'zenMode.silentNotifications': {
				'type': 'Boolean',
				'default': true,
				'description': nls.localize('zenMode.silentNotifications', "Controls whether notifications are shown while in zen mode. If true, only error notifications will pop out.")
			}
		}
	});
})();
