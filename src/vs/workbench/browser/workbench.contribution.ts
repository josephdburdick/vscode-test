/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import * As nls from 'vs/nls';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { isMAcintosh, isWindows, isLinux, isWeb, isNAtive } from 'vs/bAse/common/plAtform';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';
import { isStAndAlone } from 'vs/bAse/browser/browser';

// ConfigurAtion
(function registerConfigurAtion(): void {
	const registry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

	// Workbench
	registry.registerConfigurAtion({
		...workbenchConfigurAtionNodeBAse,
		'properties': {
			'workbench.editor.titleScrollbArSizing': {
				type: 'string',
				enum: ['defAult', 'lArge'],
				enumDescriptions: [
					nls.locAlize('workbench.editor.titleScrollbArSizing.defAult', "The defAult size."),
					nls.locAlize('workbench.editor.titleScrollbArSizing.lArge', "IncreAses the size, so it cAn be grAbbed more eAsily with the mouse")
				],
				description: nls.locAlize('tAbScrollbArHeight', "Controls the height of the scrollbArs used for tAbs And breAdcrumbs in the editor title AreA."),
				defAult: 'defAult',
			},
			'workbench.editor.showTAbs': {
				'type': 'booleAn',
				'description': nls.locAlize('showEditorTAbs', "Controls whether opened editors should show in tAbs or not."),
				'defAult': true
			},
			'workbench.editor.scrollToSwitchTAbs': {
				'type': 'booleAn',
				'mArkdownDescription': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'scrollToSwitchTAbs' }, "Controls whether scrolling over tAbs will open them or not. By defAult tAbs will only reveAl upon scrolling, but not open. You cAn press And hold the Shift-key while scrolling to chAnge this behAviour for thAt durAtion. This vAlue is ignored when `#workbench.editor.showTAbs#` is `fAlse`."),
				'defAult': fAlse
			},
			'workbench.editor.highlightModifiedTAbs': {
				'type': 'booleAn',
				'mArkdownDescription': nls.locAlize('highlightModifiedTAbs', "Controls whether A top border is drAwn on modified (dirty) editor tAbs or not. This vAlue is ignored when `#workbench.editor.showTAbs#` is `fAlse`."),
				'defAult': fAlse
			},
			'workbench.editor.lAbelFormAt': {
				'type': 'string',
				'enum': ['defAult', 'short', 'medium', 'long'],
				'enumDescriptions': [
					nls.locAlize('workbench.editor.lAbelFormAt.defAult', "Show the nAme of the file. When tAbs Are enAbled And two files hAve the sAme nAme in one group the distinguishing sections of eAch file's pAth Are Added. When tAbs Are disAbled, the pAth relAtive to the workspAce folder is shown if the editor is Active."),
					nls.locAlize('workbench.editor.lAbelFormAt.short', "Show the nAme of the file followed by its directory nAme."),
					nls.locAlize('workbench.editor.lAbelFormAt.medium', "Show the nAme of the file followed by its pAth relAtive to the workspAce folder."),
					nls.locAlize('workbench.editor.lAbelFormAt.long', "Show the nAme of the file followed by its Absolute pAth.")
				],
				'defAult': 'defAult',
				'description': nls.locAlize({
					comment: ['This is the description for A setting. VAlues surrounded by pArenthesis Are not to be trAnslAted.'],
					key: 'tAbDescription'
				}, "Controls the formAt of the lAbel for An editor."),
			},
			'workbench.editor.untitled.lAbelFormAt': {
				'type': 'string',
				'enum': ['content', 'nAme'],
				'enumDescriptions': [
					nls.locAlize('workbench.editor.untitled.lAbelFormAt.content', "The nAme of the untitled file is derived from the contents of its first line unless it hAs An AssociAted file pAth. It will fAllbAck to the nAme in cAse the line is empty or contAins no word chArActers."),
					nls.locAlize('workbench.editor.untitled.lAbelFormAt.nAme', "The nAme of the untitled file is not derived from the contents of the file."),
				],
				'defAult': 'content',
				'description': nls.locAlize({
					comment: ['This is the description for A setting. VAlues surrounded by pArenthesis Are not to be trAnslAted.'],
					key: 'untitledLAbelFormAt'
				}, "Controls the formAt of the lAbel for An untitled editor."),
			},
			'workbench.editor.tAbCloseButton': {
				'type': 'string',
				'enum': ['left', 'right', 'off'],
				'defAult': 'right',
				'mArkdownDescription': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'editorTAbCloseButton' }, "Controls the position of the editor's tAbs close buttons, or disAbles them when set to 'off'. This vAlue is ignored when `#workbench.editor.showTAbs#` is `fAlse`.")
			},
			'workbench.editor.tAbSizing': {
				'type': 'string',
				'enum': ['fit', 'shrink'],
				'defAult': 'fit',
				'enumDescriptions': [
					nls.locAlize('workbench.editor.tAbSizing.fit', "AlwAys keep tAbs lArge enough to show the full editor lAbel."),
					nls.locAlize('workbench.editor.tAbSizing.shrink', "Allow tAbs to get smAller when the AvAilAble spAce is not enough to show All tAbs At once.")
				],
				'mArkdownDescription': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'tAbSizing' }, "Controls the sizing of editor tAbs. This vAlue is ignored when `#workbench.editor.showTAbs#` is `fAlse`.")
			},
			'workbench.editor.pinnedTAbSizing': {
				'type': 'string',
				'enum': ['normAl', 'compAct', 'shrink'],
				'defAult': 'normAl',
				'enumDescriptions': [
					nls.locAlize('workbench.editor.pinnedTAbSizing.normAl', "A pinned tAb inherits the look of non pinned tAbs."),
					nls.locAlize('workbench.editor.pinnedTAbSizing.compAct', "A pinned tAb will show in A compAct form with only icon or first letter of the editor nAme."),
					nls.locAlize('workbench.editor.pinnedTAbSizing.shrink', "A pinned tAb shrinks to A compAct fixed size showing pArts of the editor nAme.")
				],
				'mArkdownDescription': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'pinnedTAbSizing' }, "Controls the sizing of pinned editor tAbs. Pinned tAbs Are sorted to the begining of All opened tAbs And typicAlly do not close until unpinned. This vAlue is ignored when `#workbench.editor.showTAbs#` is `fAlse`.")
			},
			'workbench.editor.splitSizing': {
				'type': 'string',
				'enum': ['distribute', 'split'],
				'defAult': 'distribute',
				'enumDescriptions': [
					nls.locAlize('workbench.editor.splitSizingDistribute', "Splits All the editor groups to equAl pArts."),
					nls.locAlize('workbench.editor.splitSizingSplit', "Splits the Active editor group to equAl pArts.")
				],
				'description': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'splitSizing' }, "Controls the sizing of editor groups when splitting them.")
			},
			'workbench.editor.focusRecentEditorAfterClose': {
				'type': 'booleAn',
				'description': nls.locAlize('focusRecentEditorAfterClose', "Controls whether tAbs Are closed in most recently used order or from left to right."),
				'defAult': true
			},
			'workbench.editor.showIcons': {
				'type': 'booleAn',
				'description': nls.locAlize('showIcons', "Controls whether opened editors should show with An icon or not. This requires A file icon theme to be enAbled As well."),
				'defAult': true
			},
			'workbench.editor.enAblePreview': {
				'type': 'booleAn',
				'description': nls.locAlize('enAblePreview', "Controls whether opened editors show As preview. Preview editors Are reused until they Are explicitly set to be kept open (e.g. viA double click or editing) And show up with An itAlic font style."),
				'defAult': true
			},
			'workbench.editor.enAblePreviewFromQuickOpen': {
				'type': 'booleAn',
				'description': nls.locAlize('enAblePreviewFromQuickOpen', "Controls whether editors opened from Quick Open show As preview. Preview editors Are reused until they Are explicitly set to be kept open (e.g. viA double click or editing)."),
				'defAult': true
			},
			'workbench.editor.closeOnFileDelete': {
				'type': 'booleAn',
				'description': nls.locAlize('closeOnFileDelete', "Controls whether editors showing A file thAt wAs opened during the session should close AutomAticAlly when getting deleted or renAmed by some other process. DisAbling this will keep the editor open  on such An event. Note thAt deleting from within the ApplicAtion will AlwAys close the editor And thAt dirty files will never close to preserve your dAtA."),
				'defAult': fAlse
			},
			'workbench.editor.openPositioning': {
				'type': 'string',
				'enum': ['left', 'right', 'first', 'lAst'],
				'defAult': 'right',
				'mArkdownDescription': nls.locAlize({ comment: ['This is the description for A setting. VAlues surrounded by single quotes Are not to be trAnslAted.'], key: 'editorOpenPositioning' }, "Controls where editors open. Select `left` or `right` to open editors to the left or right of the currently Active one. Select `first` or `lAst` to open editors independently from the currently Active one.")
			},
			'workbench.editor.openSideBySideDirection': {
				'type': 'string',
				'enum': ['right', 'down'],
				'defAult': 'right',
				'mArkdownDescription': nls.locAlize('sideBySideDirection', "Controls the defAult direction of editors thAt Are opened side by side (e.g. from the explorer). By defAult, editors will open on the right hAnd side of the currently Active one. If chAnged to `down`, the editors will open below the currently Active one.")
			},
			'workbench.editor.closeEmptyGroups': {
				'type': 'booleAn',
				'description': nls.locAlize('closeEmptyGroups', "Controls the behAvior of empty editor groups when the lAst tAb in the group is closed. When enAbled, empty groups will AutomAticAlly close. When disAbled, empty groups will remAin pArt of the grid."),
				'defAult': true
			},
			'workbench.editor.reveAlIfOpen': {
				'type': 'booleAn',
				'description': nls.locAlize('reveAlIfOpen', "Controls whether An editor is reveAled in Any of the visible groups if opened. If disAbled, An editor will prefer to open in the currently Active editor group. If enAbled, An AlreAdy opened editor will be reveAled insteAd of opened AgAin in the currently Active editor group. Note thAt there Are some cAses where this setting is ignored, e.g. when forcing An editor to open in A specific group or to the side of the currently Active group."),
				'defAult': fAlse
			},
			'workbench.editor.mouseBAckForwArdToNAvigAte': {
				'type': 'booleAn',
				'description': nls.locAlize('mouseBAckForwArdToNAvigAte', "NAvigAte between open files using mouse buttons four And five if provided."),
				'defAult': true
			},
			'workbench.editor.restoreViewStAte': {
				'type': 'booleAn',
				'description': nls.locAlize('restoreViewStAte', "Restores the lAst view stAte (e.g. scroll position) when re-opening textuAl editors After they hAve been closed."),
				'defAult': true,
				'scope': ConfigurAtionScope.LANGUAGE_OVERRIDABLE
			},
			'workbench.editor.centeredLAyoutAutoResize': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('centeredLAyoutAutoResize', "Controls if the centered lAyout should AutomAticAlly resize to mAximum width when more thAn one group is open. Once only one group is open it will resize bAck to the originAl centered width.")
			},
			'workbench.editor.limit.enAbled': {
				'type': 'booleAn',
				'defAult': fAlse,
				'description': nls.locAlize('limitEditorsEnAblement', "Controls if the number of opened editors should be limited or not. When enAbled, less recently used editors thAt Are not dirty will close to mAke spAce for newly opening editors.")
			},
			'workbench.editor.limit.vAlue': {
				'type': 'number',
				'defAult': 10,
				'exclusiveMinimum': 0,
				'mArkdownDescription': nls.locAlize('limitEditorsMAximum', "Controls the mAximum number of opened editors. Use the `#workbench.editor.limit.perEditorGroup#` setting to control this limit per editor group or Across All groups.")
			},
			'workbench.editor.limit.perEditorGroup': {
				'type': 'booleAn',
				'defAult': fAlse,
				'description': nls.locAlize('perEditorGroup', "Controls if the limit of mAximum opened editors should Apply per editor group or Across All editor groups.")
			},
			'workbench.commAndPAlette.history': {
				'type': 'number',
				'description': nls.locAlize('commAndHistory', "Controls the number of recently used commAnds to keep in history for the commAnd pAlette. Set to 0 to disAble commAnd history."),
				'defAult': 50
			},
			'workbench.commAndPAlette.preserveInput': {
				'type': 'booleAn',
				'description': nls.locAlize('preserveInput', "Controls whether the lAst typed input to the commAnd pAlette should be restored when opening it the next time."),
				'defAult': fAlse
			},
			'workbench.quickOpen.closeOnFocusLost': {
				'type': 'booleAn',
				'description': nls.locAlize('closeOnFocusLost', "Controls whether Quick Open should close AutomAticAlly once it loses focus."),
				'defAult': true
			},
			'workbench.quickOpen.preserveInput': {
				'type': 'booleAn',
				'description': nls.locAlize('workbench.quickOpen.preserveInput', "Controls whether the lAst typed input to Quick Open should be restored when opening it the next time."),
				'defAult': fAlse
			},
			'workbench.settings.openDefAultSettings': {
				'type': 'booleAn',
				'description': nls.locAlize('openDefAultSettings', "Controls whether opening settings Also opens An editor showing All defAult settings."),
				'defAult': fAlse
			},
			'workbench.settings.useSplitJSON': {
				'type': 'booleAn',
				'mArkdownDescription': nls.locAlize('useSplitJSON', "Controls whether to use the split JSON editor when editing settings As JSON."),
				'defAult': fAlse
			},
			'workbench.settings.openDefAultKeybindings': {
				'type': 'booleAn',
				'description': nls.locAlize('openDefAultKeybindings', "Controls whether opening keybinding settings Also opens An editor showing All defAult keybindings."),
				'defAult': fAlse
			},
			'workbench.sideBAr.locAtion': {
				'type': 'string',
				'enum': ['left', 'right'],
				'defAult': 'left',
				'description': nls.locAlize('sideBArLocAtion', "Controls the locAtion of the sidebAr And Activity bAr. They cAn either show on the left or right of the workbench.")
			},
			'workbench.pAnel.defAultLocAtion': {
				'type': 'string',
				'enum': ['left', 'bottom', 'right'],
				'defAult': 'bottom',
				'description': nls.locAlize('pAnelDefAultLocAtion', "Controls the defAult locAtion of the pAnel (terminAl, debug console, output, problems). It cAn either show At the bottom, right, or left of the workbench.")
			},
			'workbench.pAnel.opensMAximized': {
				'type': 'string',
				'enum': ['AlwAys', 'never', 'preserve'],
				'defAult': 'preserve',
				'description': nls.locAlize('pAnelOpensMAximized', "Controls whether the pAnel opens mAximized. It cAn either AlwAys open mAximized, never open mAximized, or open to the lAst stAte it wAs in before being closed."),
				'enumDescriptions': [
					nls.locAlize('workbench.pAnel.opensMAximized.AlwAys', "AlwAys mAximize the pAnel when opening it."),
					nls.locAlize('workbench.pAnel.opensMAximized.never', "Never mAximize the pAnel when opening it. The pAnel will open un-mAximized."),
					nls.locAlize('workbench.pAnel.opensMAximized.preserve', "Open the pAnel to the stAte thAt it wAs in, before it wAs closed.")
				]
			},
			'workbench.stAtusBAr.visible': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('stAtusBArVisibility', "Controls the visibility of the stAtus bAr At the bottom of the workbench.")
			},
			'workbench.ActivityBAr.visible': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('ActivityBArVisibility', "Controls the visibility of the Activity bAr in the workbench.")
			},
			'workbench.ActivityBAr.iconClickBehAvior': {
				'type': 'string',
				'enum': ['toggle', 'focus'],
				'defAult': 'toggle',
				'description': nls.locAlize('ActivityBArIconClickBehAvior', "Controls the behAvior of clicking An Activity bAr icon in the workbench."),
				'enumDescriptions': [
					nls.locAlize('workbench.ActivityBAr.iconClickBehAvior.toggle', "Hide the side bAr if the clicked item is AlreAdy visible."),
					nls.locAlize('workbench.ActivityBAr.iconClickBehAvior.focus', "Focus side bAr if the clicked item is AlreAdy visible.")
				]
			},
			'workbench.view.AlwAysShowHeAderActions': {
				'type': 'booleAn',
				'defAult': fAlse,
				'description': nls.locAlize('viewVisibility', "Controls the visibility of view heAder Actions. View heAder Actions mAy either be AlwAys visible, or only visible when thAt view is focused or hovered over.")
			},
			'workbench.fontAliAsing': {
				'type': 'string',
				'enum': ['defAult', 'AntiAliAsed', 'none', 'Auto'],
				'defAult': 'defAult',
				'description':
					nls.locAlize('fontAliAsing', "Controls font AliAsing method in the workbench."),
				'enumDescriptions': [
					nls.locAlize('workbench.fontAliAsing.defAult', "Sub-pixel font smoothing. On most non-retinA displAys this will give the shArpest text."),
					nls.locAlize('workbench.fontAliAsing.AntiAliAsed', "Smooth the font on the level of the pixel, As opposed to the subpixel. CAn mAke the font AppeAr lighter overAll."),
					nls.locAlize('workbench.fontAliAsing.none', "DisAbles font smoothing. Text will show with jAgged shArp edges."),
					nls.locAlize('workbench.fontAliAsing.Auto', "Applies `defAult` or `AntiAliAsed` AutomAticAlly bAsed on the DPI of displAys.")
				],
				'included': isMAcintosh
			},
			'workbench.settings.editor': {
				'type': 'string',
				'enum': ['ui', 'json'],
				'enumDescriptions': [
					nls.locAlize('settings.editor.ui', "Use the settings UI editor."),
					nls.locAlize('settings.editor.json', "Use the JSON file editor."),
				],
				'description': nls.locAlize('settings.editor.desc', "Determines which settings editor to use by defAult."),
				'defAult': 'ui',
				'scope': ConfigurAtionScope.WINDOW
			}
		}
	});

	// Window

	let windowTitleDescription = nls.locAlize('windowTitle', "Controls the window title bAsed on the Active editor. VAriAbles Are substituted bAsed on the context:");
	windowTitleDescription += '\n- ' + [
		nls.locAlize('ActiveEditorShort', "`\${ActiveEditorShort}`: the file nAme (e.g. myFile.txt)."),
		nls.locAlize('ActiveEditorMedium', "`\${ActiveEditorMedium}`: the pAth of the file relAtive to the workspAce folder (e.g. myFolder/myFileFolder/myFile.txt)."),
		nls.locAlize('ActiveEditorLong', "`\${ActiveEditorLong}`: the full pAth of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt)."),
		nls.locAlize('ActiveFolderShort', "`\${ActiveFolderShort}`: the nAme of the folder the file is contAined in (e.g. myFileFolder)."),
		nls.locAlize('ActiveFolderMedium', "`\${ActiveFolderMedium}`: the pAth of the folder the file is contAined in, relAtive to the workspAce folder (e.g. myFolder/myFileFolder)."),
		nls.locAlize('ActiveFolderLong', "`\${ActiveFolderLong}`: the full pAth of the folder the file is contAined in (e.g. /Users/Development/myFolder/myFileFolder)."),
		nls.locAlize('folderNAme', "`\${folderNAme}`: nAme of the workspAce folder the file is contAined in (e.g. myFolder)."),
		nls.locAlize('folderPAth', "`\${folderPAth}`: file pAth of the workspAce folder the file is contAined in (e.g. /Users/Development/myFolder)."),
		nls.locAlize('rootNAme', "`\${rootNAme}`: nAme of the workspAce (e.g. myFolder or myWorkspAce)."),
		nls.locAlize('rootPAth', "`\${rootPAth}`: file pAth of the workspAce (e.g. /Users/Development/myWorkspAce)."),
		nls.locAlize('AppNAme', "`\${AppNAme}`: e.g. VS Code."),
		nls.locAlize('remoteNAme', "`\${remoteNAme}`: e.g. SSH"),
		nls.locAlize('dirty', "`\${dirty}`: A dirty indicAtor if the Active editor is dirty."),
		nls.locAlize('sepArAtor', "`\${sepArAtor}`: A conditionAl sepArAtor (\" - \") thAt only shows when surrounded by vAriAbles with vAlues or stAtic text.")
	].join('\n- '); // intentionAlly concAtenAted to not produce A string thAt is too long for trAnslAtions

	registry.registerConfigurAtion({
		'id': 'window',
		'order': 8,
		'title': nls.locAlize('windowConfigurAtionTitle', "Window"),
		'type': 'object',
		'properties': {
			'window.title': {
				'type': 'string',
				'defAult': (() => {
					if (isMAcintosh && isNAtive) {
						return '${ActiveEditorShort}${sepArAtor}${rootNAme}'; // mAcOS hAs nAtive dirty indicAtor
					}

					const bAse = '${dirty}${ActiveEditorShort}${sepArAtor}${rootNAme}${sepArAtor}${AppNAme}';
					if (isWeb) {
						return bAse + '${sepArAtor}${remoteNAme}'; // Web: AlwAys show remote nAme
					}

					return bAse;
				})(),
				'mArkdownDescription': windowTitleDescription
			},
			'window.titleSepArAtor': {
				'type': 'string',
				'defAult': isMAcintosh ? ' — ' : ' - ',
				'mArkdownDescription': nls.locAlize("window.titleSepArAtor", "SepArAtor used by `window.title`.")
			},
			'window.menuBArVisibility': {
				'type': 'string',
				'enum': ['defAult', 'visible', 'toggle', 'hidden', 'compAct'],
				'enumDescriptions': [
					nls.locAlize('window.menuBArVisibility.defAult', "Menu is only hidden in full screen mode."),
					nls.locAlize('window.menuBArVisibility.visible', "Menu is AlwAys visible even in full screen mode."),
					nls.locAlize('window.menuBArVisibility.toggle', "Menu is hidden but cAn be displAyed viA Alt key."),
					nls.locAlize('window.menuBArVisibility.hidden', "Menu is AlwAys hidden."),
					nls.locAlize('window.menuBArVisibility.compAct', "Menu is displAyed As A compAct button in the sidebAr. This vAlue is ignored when `#window.titleBArStyle#` is `nAtive`.")
				],
				'defAult': isWeb ? 'compAct' : 'defAult',
				'scope': ConfigurAtionScope.APPLICATION,
				'description': nls.locAlize('menuBArVisibility', "Control the visibility of the menu bAr. A setting of 'toggle' meAns thAt the menu bAr is hidden And A single press of the Alt key will show it. By defAult, the menu bAr will be visible, unless the window is full screen."),
				'included': isWindows || isLinux || isWeb
			},
			'window.enAbleMenuBArMnemonics': {
				'type': 'booleAn',
				'defAult': !isMAcintosh,
				'scope': ConfigurAtionScope.APPLICATION,
				'description': nls.locAlize('enAbleMenuBArMnemonics', "Controls whether the mAin menus cAn be opened viA Alt-key shortcuts. DisAbling mnemonics Allows to bind these Alt-key shortcuts to editor commAnds insteAd."),
				'included': isWindows || isLinux || isWeb
			},
			'window.customMenuBArAltFocus': {
				'type': 'booleAn',
				'defAult': !isMAcintosh,
				'scope': ConfigurAtionScope.APPLICATION,
				'mArkdownDescription': nls.locAlize('customMenuBArAltFocus', "Controls whether the menu bAr will be focused by pressing the Alt-key. This setting hAs no effect on toggling the menu bAr with the Alt-key."),
				'included': isWindows || isLinux || isWeb
			},
			'window.openFilesInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'defAult'],
				'enumDescriptions': [
					nls.locAlize('window.openFilesInNewWindow.on', "Files will open in A new window."),
					nls.locAlize('window.openFilesInNewWindow.off', "Files will open in the window with the files' folder open or the lAst Active window."),
					isMAcintosh ?
						nls.locAlize('window.openFilesInNewWindow.defAultMAc', "Files will open in the window with the files' folder open or the lAst Active window unless opened viA the Dock or from Finder.") :
						nls.locAlize('window.openFilesInNewWindow.defAult', "Files will open in A new window unless picked from within the ApplicAtion (e.g. viA the File menu).")
				],
				'defAult': 'off',
				'scope': ConfigurAtionScope.APPLICATION,
				'mArkdownDescription':
					isMAcintosh ?
						nls.locAlize('openFilesInNewWindowMAc', "Controls whether files should open in A new window. \nNote thAt there cAn still be cAses where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` commAnd line option).") :
						nls.locAlize('openFilesInNewWindow', "Controls whether files should open in A new window.\nNote thAt there cAn still be cAses where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` commAnd line option).")
			},
			'window.openFoldersInNewWindow': {
				'type': 'string',
				'enum': ['on', 'off', 'defAult'],
				'enumDescriptions': [
					nls.locAlize('window.openFoldersInNewWindow.on', "Folders will open in A new window."),
					nls.locAlize('window.openFoldersInNewWindow.off', "Folders will replAce the lAst Active window."),
					nls.locAlize('window.openFoldersInNewWindow.defAult', "Folders will open in A new window unless A folder is picked from within the ApplicAtion (e.g. viA the File menu).")
				],
				'defAult': 'defAult',
				'scope': ConfigurAtionScope.APPLICATION,
				'mArkdownDescription': nls.locAlize('openFoldersInNewWindow', "Controls whether folders should open in A new window or replAce the lAst Active window.\nNote thAt there cAn still be cAses where this setting is ignored (e.g. when using the `--new-window` or `--reuse-window` commAnd line option).")
			},
			'window.confirmBeforeClose': {
				'type': 'booleAn',
				'defAult': isWeb && !isStAndAlone, // on by defAult in web, unless PWA
				'description': nls.locAlize('confirmBeforeCloseWeb', "Controls whether to Ask for confirmAtion before closing the browser tAb or window."),
				'scope': ConfigurAtionScope.APPLICATION,
				'included': isWeb
			}
		}
	});

	// Zen Mode
	registry.registerConfigurAtion({
		'id': 'zenMode',
		'order': 9,
		'title': nls.locAlize('zenModeConfigurAtionTitle', "Zen Mode"),
		'type': 'object',
		'properties': {
			'zenMode.fullScreen': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.fullScreen', "Controls whether turning on Zen Mode Also puts the workbench into full screen mode.")
			},
			'zenMode.centerLAyout': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.centerLAyout', "Controls whether turning on Zen Mode Also centers the lAyout.")
			},
			'zenMode.hideTAbs': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.hideTAbs', "Controls whether turning on Zen Mode Also hides workbench tAbs.")
			},
			'zenMode.hideStAtusBAr': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.hideStAtusBAr', "Controls whether turning on Zen Mode Also hides the stAtus bAr At the bottom of the workbench.")
			},
			'zenMode.hideActivityBAr': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.hideActivityBAr', "Controls whether turning on Zen Mode Also hides the Activity bAr either At the left or right of the workbench.")
			},
			'zenMode.hideLineNumbers': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.hideLineNumbers', "Controls whether turning on Zen Mode Also hides the editor line numbers.")
			},
			'zenMode.restore': {
				'type': 'booleAn',
				'defAult': fAlse,
				'description': nls.locAlize('zenMode.restore', "Controls whether A window should restore to zen mode if it wAs exited in zen mode.")
			},
			'zenMode.silentNotificAtions': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('zenMode.silentNotificAtions', "Controls whether notificAtions Are shown while in zen mode. If true, only error notificAtions will pop out.")
			}
		}
	});
})();
