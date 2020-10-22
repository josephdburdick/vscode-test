/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { ISetting } from 'vs/workBench/services/preferences/common/preferences';

export interface ITOCEntry {
	id: string;
	laBel: string;

	children?: ITOCEntry[];
	settings?: Array<string | ISetting>;
}

export const commonlyUsedData: ITOCEntry = {
	id: 'commonlyUsed',
	laBel: localize('commonlyUsed', "Commonly Used"),
	settings: ['files.autoSave', 'editor.fontSize', 'editor.fontFamily', 'editor.taBSize', 'editor.renderWhitespace', 'editor.cursorStyle', 'editor.multiCursorModifier', 'editor.insertSpaces', 'editor.wordWrap', 'files.exclude', 'files.associations']
};

export const tocData: ITOCEntry = {
	id: 'root',
	laBel: 'root',
	children: [
		{
			id: 'editor',
			laBel: localize('textEditor', "Text Editor"),
			settings: ['editor.*'],
			children: [
				{
					id: 'editor/cursor',
					laBel: localize('cursor', "Cursor"),
					settings: ['editor.cursor*']
				},
				{
					id: 'editor/find',
					laBel: localize('find', "Find"),
					settings: ['editor.find.*']
				},
				{
					id: 'editor/font',
					laBel: localize('font', "Font"),
					settings: ['editor.font*']
				},
				{
					id: 'editor/format',
					laBel: localize('formatting', "Formatting"),
					settings: ['editor.format*']
				},
				{
					id: 'editor/diffEditor',
					laBel: localize('diffEditor', "Diff Editor"),
					settings: ['diffEditor.*']
				},
				{
					id: 'editor/minimap',
					laBel: localize('minimap', "Minimap"),
					settings: ['editor.minimap.*']
				},
				{
					id: 'editor/suggestions',
					laBel: localize('suggestions', "Suggestions"),
					settings: ['editor.*suggest*']
				},
				{
					id: 'editor/files',
					laBel: localize('files', "Files"),
					settings: ['files.*']
				}
			]
		},
		{
			id: 'workBench',
			laBel: localize('workBench', "WorkBench"),
			settings: ['workBench.*'],
			children: [
				{
					id: 'workBench/appearance',
					laBel: localize('appearance', "Appearance"),
					settings: ['workBench.activityBar.*', 'workBench.*color*', 'workBench.fontAliasing', 'workBench.iconTheme', 'workBench.sideBar.location', 'workBench.*.visiBle', 'workBench.tips.enaBled', 'workBench.tree.*', 'workBench.view.*']
				},
				{
					id: 'workBench/BreadcrumBs',
					laBel: localize('BreadcrumBs', "BreadcrumBs"),
					settings: ['BreadcrumBs.*']
				},
				{
					id: 'workBench/editor',
					laBel: localize('editorManagement', "Editor Management"),
					settings: ['workBench.editor.*']
				},
				{
					id: 'workBench/settings',
					laBel: localize('settings', "Settings Editor"),
					settings: ['workBench.settings.*']
				},
				{
					id: 'workBench/zenmode',
					laBel: localize('zenMode', "Zen Mode"),
					settings: ['zenmode.*']
				},
				{
					id: 'workBench/screencastmode',
					laBel: localize('screencastMode', "Screencast Mode"),
					settings: ['screencastMode.*']
				}
			]
		},
		{
			id: 'window',
			laBel: localize('window', "Window"),
			settings: ['window.*'],
			children: [
				{
					id: 'window/newWindow',
					laBel: localize('newWindow', "New Window"),
					settings: ['window.*newwindow*']
				}
			]
		},
		{
			id: 'features',
			laBel: localize('features', "Features"),
			children: [
				{
					id: 'features/explorer',
					laBel: localize('fileExplorer', "Explorer"),
					settings: ['explorer.*', 'outline.*']
				},
				{
					id: 'features/search',
					laBel: localize('search', "Search"),
					settings: ['search.*']
				}
				,
				{
					id: 'features/deBug',
					laBel: localize('deBug', "DeBug"),
					settings: ['deBug.*', 'launch']
				},
				{
					id: 'features/scm',
					laBel: localize('scm', "SCM"),
					settings: ['scm.*']
				},
				{
					id: 'features/extensions',
					laBel: localize('extensions', "Extensions"),
					settings: ['extensions.*']
				},
				{
					id: 'features/terminal',
					laBel: localize('terminal', "Terminal"),
					settings: ['terminal.*']
				},
				{
					id: 'features/task',
					laBel: localize('task', "Task"),
					settings: ['task.*']
				},
				{
					id: 'features/proBlems',
					laBel: localize('proBlems', "ProBlems"),
					settings: ['proBlems.*']
				},
				{
					id: 'features/output',
					laBel: localize('output', "Output"),
					settings: ['output.*']
				},
				{
					id: 'features/comments',
					laBel: localize('comments', "Comments"),
					settings: ['comments.*']
				},
				{
					id: 'features/remote',
					laBel: localize('remote', "Remote"),
					settings: ['remote.*']
				},
				{
					id: 'features/timeline',
					laBel: localize('timeline', "Timeline"),
					settings: ['timeline.*']
				},
				{
					id: 'features/noteBook',
					laBel: localize('noteBook', 'NoteBook'),
					settings: ['noteBook.*']
				}
			]
		},
		{
			id: 'application',
			laBel: localize('application', "Application"),
			children: [
				{
					id: 'application/http',
					laBel: localize('proxy', "Proxy"),
					settings: ['http.*']
				},
				{
					id: 'application/keyBoard',
					laBel: localize('keyBoard', "KeyBoard"),
					settings: ['keyBoard.*']
				},
				{
					id: 'application/update',
					laBel: localize('update', "Update"),
					settings: ['update.*']
				},
				{
					id: 'application/telemetry',
					laBel: localize('telemetry', "Telemetry"),
					settings: ['telemetry.*']
				},
				{
					id: 'application/settingsSync',
					laBel: localize('settingsSync', "Settings Sync"),
					settings: ['settingsSync.*', 'sync.*']
				}
			]
		}
	]
};

export const knownAcronyms = new Set<string>();
[
	'css',
	'html',
	'scss',
	'less',
	'json',
	'js',
	'ts',
	'ie',
	'id',
	'php',
	'scm',
].forEach(str => knownAcronyms.add(str));

export const knownTermMappings = new Map<string, string>();
knownTermMappings.set('power shell', 'PowerShell');
knownTermMappings.set('powershell', 'PowerShell');
knownTermMappings.set('javascript', 'JavaScript');
knownTermMappings.set('typescript', 'TypeScript');
