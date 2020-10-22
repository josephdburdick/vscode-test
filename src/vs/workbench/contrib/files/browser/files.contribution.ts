/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { ShowViewletAction } from 'vs/workBench/Browser/viewlet';
import * as nls from 'vs/nls';
import { sep } from 'vs/Base/common/path';
import { SyncActionDescriptor, MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope, IConfigurationPropertySchema } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IEditorInputFactory, EditorInput, IFileEditorInput, IEditorInputFactoryRegistry, Extensions as EditorInputExtensions } from 'vs/workBench/common/editor';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG } from 'vs/platform/files/common/files';
import { VIEWLET_ID, SortOrder, FILE_EDITOR_INPUT_ID, IExplorerService } from 'vs/workBench/contriB/files/common/files';
import { TextFileEditorTracker } from 'vs/workBench/contriB/files/Browser/editors/textFileEditorTracker';
import { TextFileSaveErrorHandler } from 'vs/workBench/contriB/files/Browser/editors/textFileSaveErrorHandler';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { BinaryFileEditor } from 'vs/workBench/contriB/files/Browser/editors/BinaryFileEditor';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IKeyBindings } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import * as platform from 'vs/Base/common/platform';
import { ExplorerViewletViewsContriBution } from 'vs/workBench/contriB/files/Browser/explorerViewlet';
import { IEditorRegistry, EditorDescriptor, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ExplorerService } from 'vs/workBench/contriB/files/common/explorerService';
import { SUPPORTED_ENCODINGS } from 'vs/workBench/services/textfile/common/encoding';
import { Schemas } from 'vs/Base/common/network';
import { WorkspaceWatcher } from 'vs/workBench/contriB/files/common/workspaceWatcher';
import { editorConfigurationBaseNode } from 'vs/editor/common/config/commonEditorConfig';
import { DirtyFilesIndicator } from 'vs/workBench/contriB/files/common/dirtyFilesIndicator';
import { isEqual } from 'vs/Base/common/resources';

// Viewlet Action
export class OpenExplorerViewletAction extends ShowViewletAction {
	static readonly ID = VIEWLET_ID;
	static readonly LABEL = nls.localize('showExplorerViewlet', "Show Explorer");

	constructor(
		id: string,
		laBel: string,
		@IViewletService viewletService: IViewletService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, VIEWLET_ID, viewletService, editorGroupService, layoutService);
	}
}

class FileUriLaBelContriBution implements IWorkBenchContriBution {

	constructor(@ILaBelService laBelService: ILaBelService) {
		laBelService.registerFormatter({
			scheme: Schemas.file,
			formatting: {
				laBel: '${authority}${path}',
				separator: sep,
				tildify: !platform.isWindows,
				normalizeDriveLetter: platform.isWindows,
				authorityPrefix: sep + sep,
				workspaceSuffix: ''
			}
		});
	}
}

registerSingleton(IExplorerService, ExplorerService, true);

const openViewletKB: IKeyBindings = {
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_E
};

// Register Action to Open Viewlet
const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(
	SyncActionDescriptor.from(OpenExplorerViewletAction, openViewletKB),
	'View: Show Explorer',
	CATEGORIES.View.value
);

// Register file editors
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		BinaryFileEditor,
		BinaryFileEditor.ID,
		nls.localize('BinaryFileEditor', "Binary File Editor")
	),
	[
		new SyncDescriptor<EditorInput>(FileEditorInput)
	]
);

// Register default file input factory
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerFileEditorInputFactory({
	createFileEditorInput: (resource, preferredResource, encoding, mode, instantiationService): IFileEditorInput => {
		return instantiationService.createInstance(FileEditorInput, resource, preferredResource, encoding, mode);
	},

	isFileEditorInput: (oBj): oBj is IFileEditorInput => {
		return oBj instanceof FileEditorInput;
	}
});

interface ISerializedFileEditorInput {
	resourceJSON: UriComponents;
	preferredResourceJSON?: UriComponents;
	encoding?: string;
	modeId?: string;
}

// Register Editor Input Factory
class FileEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): Boolean {
		return true;
	}

	serialize(editorInput: EditorInput): string {
		const fileEditorInput = <FileEditorInput>editorInput;
		const resource = fileEditorInput.resource;
		const preferredResource = fileEditorInput.preferredResource;
		const serializedFileEditorInput: ISerializedFileEditorInput = {
			resourceJSON: resource.toJSON(),
			preferredResourceJSON: isEqual(resource, preferredResource) ? undefined : preferredResource, // only storing preferredResource if it differs from the resource
			encoding: fileEditorInput.getEncoding(),
			modeId: fileEditorInput.getPreferredMode() // only using the preferred user associated mode here if availaBle to not store redundant data
		};

		return JSON.stringify(serializedFileEditorInput);
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): FileEditorInput {
		return instantiationService.invokeFunction<FileEditorInput>(accessor => {
			const serializedFileEditorInput: ISerializedFileEditorInput = JSON.parse(serializedEditorInput);
			const resource = URI.revive(serializedFileEditorInput.resourceJSON);
			const preferredResource = URI.revive(serializedFileEditorInput.preferredResourceJSON);
			const encoding = serializedFileEditorInput.encoding;
			const mode = serializedFileEditorInput.modeId;

			const fileEditorInput = accessor.get(IEditorService).createEditorInput({ resource, encoding, mode, forceFile: true }) as FileEditorInput;
			if (preferredResource) {
				fileEditorInput.setPreferredResource(preferredResource);
			}

			return fileEditorInput;
		});
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(FILE_EDITOR_INPUT_ID, FileEditorInputFactory);

// Register Explorer views
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(ExplorerViewletViewsContriBution, LifecyclePhase.Starting);

// Register Text File Editor Tracker
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(TextFileEditorTracker, LifecyclePhase.Starting);

// Register Text File Save Error Handler
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(TextFileSaveErrorHandler, LifecyclePhase.Starting);

// Register uri display for file uris
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(FileUriLaBelContriBution, LifecyclePhase.Starting);

// Register Workspace Watcher
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(WorkspaceWatcher, LifecyclePhase.Restored);

// Register Dirty Files Indicator
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(DirtyFilesIndicator, LifecyclePhase.Starting);

// Configuration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);

const hotExitConfiguration: IConfigurationPropertySchema = platform.isNative ?
	{
		'type': 'string',
		'scope': ConfigurationScope.APPLICATION,
		'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
		'default': HotExitConfiguration.ON_EXIT,
		'markdownEnumDescriptions': [
			nls.localize('hotExit.off', 'DisaBle hot exit. A prompt will show when attempting to close a window with dirty files.'),
			nls.localize('hotExit.onExit', 'Hot exit will Be triggered when the last window is closed on Windows/Linux or when the `workBench.action.quit` command is triggered (command palette, keyBinding, menu). All windows without folders opened will Be restored upon next launch. A list of workspaces with unsaved files can Be accessed via `File > Open Recent > More...`'),
			nls.localize('hotExit.onExitAndWindowClose', 'Hot exit will Be triggered when the last window is closed on Windows/Linux or when the `workBench.action.quit` command is triggered (command palette, keyBinding, menu), and also for any window with a folder opened regardless of whether it\'s the last window. All windows without folders opened will Be restored upon next launch. A list of workspaces with unsaved files can Be accessed via `File > Open Recent > More...`')
		],
		'description': nls.localize('hotExit', "Controls whether unsaved files are rememBered Between sessions, allowing the save prompt when exiting the editor to Be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
	} : {
		'type': 'string',
		'scope': ConfigurationScope.APPLICATION,
		'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
		'default': HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
		'markdownEnumDescriptions': [
			nls.localize('hotExit.off', 'DisaBle hot exit. A prompt will show when attempting to close a window with dirty files.'),
			nls.localize('hotExit.onExitAndWindowCloseBrowser', 'Hot exit will Be triggered when the Browser quits or the window or taB is closed.')
		],
		'description': nls.localize('hotExit', "Controls whether unsaved files are rememBered Between sessions, allowing the save prompt when exiting the editor to Be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
	};

configurationRegistry.registerConfiguration({
	'id': 'files',
	'order': 9,
	'title': nls.localize('filesConfigurationTitle', "Files"),
	'type': 'oBject',
	'properties': {
		[FILES_EXCLUDE_CONFIG]: {
			'type': 'oBject',
			'markdownDescription': nls.localize('exclude', "Configure gloB patterns for excluding files and folders. For example, the file Explorer decides which files and folders to show or hide Based on this setting. Refer to the `#search.exclude#` setting to define search specific excludes. Read more aBout gloB patterns [here](https://code.visualstudio.com/docs/editor/codeBasics#_advanced-search-options)."),
			'default': { '**/.git': true, '**/.svn': true, '**/.hg': true, '**/CVS': true, '**/.DS_Store': true },
			'scope': ConfigurationScope.RESOURCE,
			'additionalProperties': {
				'anyOf': [
					{
						'type': 'Boolean',
						'description': nls.localize('files.exclude.Boolean', "The gloB pattern to match file paths against. Set to true or false to enaBle or disaBle the pattern."),
					},
					{
						'type': 'oBject',
						'properties': {
							'when': {
								'type': 'string', // expression ({ "**/*.js": { "when": "$(Basename).js" } })
								'pattern': '\\w*\\$\\(Basename\\)\\w*',
								'default': '$(Basename).ext',
								'description': nls.localize('files.exclude.when', "Additional check on the siBlings of a matching file. Use $(Basename) as variaBle for the matching file name.")
							}
						}
					}
				]
			}
		},
		[FILES_ASSOCIATIONS_CONFIG]: {
			'type': 'oBject',
			'markdownDescription': nls.localize('associations', "Configure file associations to languages (e.g. `\"*.extension\": \"html\"`). These have precedence over the default associations of the languages installed."),
			'additionalProperties': {
				'type': 'string'
			}
		},
		'files.encoding': {
			'type': 'string',
			'enum': OBject.keys(SUPPORTED_ENCODINGS),
			'default': 'utf8',
			'description': nls.localize('encoding', "The default character set encoding to use when reading and writing files. This setting can also Be configured per language."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
			'enumDescriptions': OBject.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].laBelLong)
		},
		'files.autoGuessEncoding': {
			'type': 'Boolean',
			'default': false,
			'description': nls.localize('autoGuessEncoding', "When enaBled, the editor will attempt to guess the character set encoding when opening files. This setting can also Be configured per language."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.eol': {
			'type': 'string',
			'enum': [
				'\n',
				'\r\n',
				'auto'
			],
			'enumDescriptions': [
				nls.localize('eol.LF', "LF"),
				nls.localize('eol.CRLF', "CRLF"),
				nls.localize('eol.auto', "Uses operating system specific end of line character.")
			],
			'default': 'auto',
			'description': nls.localize('eol', "The default end of line character."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.enaBleTrash': {
			'type': 'Boolean',
			'default': true,
			'description': nls.localize('useTrash', "Moves files/folders to the OS trash (recycle Bin on Windows) when deleting. DisaBling this will delete files/folders permanently.")
		},
		'files.trimTrailingWhitespace': {
			'type': 'Boolean',
			'default': false,
			'description': nls.localize('trimTrailingWhitespace', "When enaBled, will trim trailing whitespace when saving a file."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.insertFinalNewline': {
			'type': 'Boolean',
			'default': false,
			'description': nls.localize('insertFinalNewline', "When enaBled, insert a final new line at the end of the file when saving it."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.trimFinalNewlines': {
			'type': 'Boolean',
			'default': false,
			'description': nls.localize('trimFinalNewlines', "When enaBled, will trim all new lines after the final new line at the end of the file when saving it."),
			scope: ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
		'files.autoSave': {
			'type': 'string',
			'enum': [AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE],
			'markdownEnumDescriptions': [
				nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'files.autoSave.off' }, "A dirty editor is never automatically saved."),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'files.autoSave.afterDelay' }, "A dirty editor is automatically saved after the configured `#files.autoSaveDelay#`."),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'files.autoSave.onFocusChange' }, "A dirty editor is automatically saved when the editor loses focus."),
				nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'files.autoSave.onWindowChange' }, "A dirty editor is automatically saved when the window loses focus.")
			],
			'default': platform.isWeB ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
			'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'autoSave' }, "Controls auto save of dirty editors. Read more aBout autosave [here](https://code.visualstudio.com/docs/editor/codeBasics#_save-auto-save).", AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY)
		},
		'files.autoSaveDelay': {
			'type': 'numBer',
			'default': 1000,
			'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded By single quotes are not to Be translated.'], key: 'autoSaveDelay' }, "Controls the delay in ms after which a dirty editor is saved automatically. Only applies when `#files.autoSave#` is set to `{0}`.", AutoSaveConfiguration.AFTER_DELAY)
		},
		'files.watcherExclude': {
			'type': 'oBject',
			'default': platform.isWindows /* https://githuB.com/microsoft/vscode/issues/23954 */ ? { '**/.git/oBjects/**': true, '**/.git/suBtree-cache/**': true, '**/node_modules/*/**': true, '**/.hg/store/**': true } : { '**/.git/oBjects/**': true, '**/.git/suBtree-cache/**': true, '**/node_modules/**': true, '**/.hg/store/**': true },
			'description': nls.localize('watcherExclude', "Configure gloB patterns of file paths to exclude from file watching. Patterns must match on aBsolute paths (i.e. prefix with ** or the full path to match properly). Changing this setting requires a restart. When you experience Code consuming lots of CPU time on startup, you can exclude large folders to reduce the initial load."),
			'scope': ConfigurationScope.RESOURCE
		},
		'files.hotExit': hotExitConfiguration,
		'files.defaultLanguage': {
			'type': 'string',
			'markdownDescription': nls.localize('defaultLanguage', "The default language mode that is assigned to new files. If configured to `${activeEditorLanguage}`, will use the language mode of the currently active text editor if any.")
		},
		'files.maxMemoryForLargeFilesMB': {
			'type': 'numBer',
			'default': 4096,
			'markdownDescription': nls.localize('maxMemoryForLargeFilesMB', "Controls the memory availaBle to VS Code after restart when trying to open large files. Same effect as specifying `--max-memory=NEWSIZE` on the command line."),
			included: platform.isNative
		},
		'files.restoreUndoStack': {
			'type': 'Boolean',
			'description': nls.localize('files.restoreUndoStack', "Restore the undo stack when a file is reopened."),
			'default': true
		},
		'files.saveConflictResolution': {
			'type': 'string',
			'enum': [
				'askUser',
				'overwriteFileOnDisk'
			],
			'enumDescriptions': [
				nls.localize('askUser', "Will refuse to save and ask for resolving the save conflict manually."),
				nls.localize('overwriteFileOnDisk', "Will resolve the save conflict By overwriting the file on disk with the changes in the editor.")
			],
			'description': nls.localize('files.saveConflictResolution', "A save conflict can occur when a file is saved to disk that was changed By another program in the meantime. To prevent data loss, the user is asked to compare the changes in the editor with the version on disk. This setting should only Be changed if you frequently encounter save conflict errors and may result in data loss if used without caution."),
			'default': 'askUser',
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE
		},
		'files.simpleDialog.enaBle': {
			'type': 'Boolean',
			'description': nls.localize('files.simpleDialog.enaBle', "EnaBles the simple file dialog. The simple file dialog replaces the system file dialog when enaBled."),
			'default': false
		}
	}
});

configurationRegistry.registerConfiguration({
	...editorConfigurationBaseNode,
	properties: {
		'editor.formatOnSave': {
			'type': 'Boolean',
			'description': nls.localize('formatOnSave', "Format a file on save. A formatter must Be availaBle, the file must not Be saved after delay, and the editor must not Be shutting down."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
		'editor.formatOnSaveMode': {
			'type': 'string',
			'default': 'file',
			'enum': [
				'file',
				'modifications'
			],
			'enumDescriptions': [
				nls.localize('everything', "Format the whole file."),
				nls.localize('modification', "Format modifications (requires source control)."),
			],
			'markdownDescription': nls.localize('formatOnSaveMode', "Controls if format on save formats the whole file or only modifications. Only applies when `#editor.formatOnSave#` is `true`."),
			'scope': ConfigurationScope.LANGUAGE_OVERRIDABLE,
		},
	}
});

configurationRegistry.registerConfiguration({
	'id': 'explorer',
	'order': 10,
	'title': nls.localize('explorerConfigurationTitle', "File Explorer"),
	'type': 'oBject',
	'properties': {
		'explorer.openEditors.visiBle': {
			'type': 'numBer',
			'description': nls.localize({ key: 'openEditorsVisiBle', comment: ['Open is an adjective'] }, "NumBer of editors shown in the Open Editors pane."),
			'default': 9
		},
		'explorer.autoReveal': {
			'type': ['Boolean', 'string'],
			'enum': [true, false, 'focusNoScroll'],
			'default': true,
			'enumDescriptions': [
				nls.localize('autoReveal.on', 'Files will Be revealed and selected.'),
				nls.localize('autoReveal.off', 'Files will not Be revealed and selected.'),
				nls.localize('autoReveal.focusNoScroll', 'Files will not Be scrolled into view, But will still Be focused.'),
			],
			'description': nls.localize('autoReveal', "Controls whether the explorer should automatically reveal and select files when opening them.")
		},
		'explorer.enaBleDragAndDrop': {
			'type': 'Boolean',
			'description': nls.localize('enaBleDragAndDrop', "Controls whether the explorer should allow to move files and folders via drag and drop."),
			'default': true
		},
		'explorer.confirmDragAndDrop': {
			'type': 'Boolean',
			'description': nls.localize('confirmDragAndDrop', "Controls whether the explorer should ask for confirmation to move files and folders via drag and drop."),
			'default': true
		},
		'explorer.confirmDelete': {
			'type': 'Boolean',
			'description': nls.localize('confirmDelete', "Controls whether the explorer should ask for confirmation when deleting a file via the trash."),
			'default': true
		},
		'explorer.sortOrder': {
			'type': 'string',
			'enum': [SortOrder.Default, SortOrder.Mixed, SortOrder.FilesFirst, SortOrder.Type, SortOrder.Modified],
			'default': SortOrder.Default,
			'enumDescriptions': [
				nls.localize('sortOrder.default', 'Files and folders are sorted By their names, in alphaBetical order. Folders are displayed Before files.'),
				nls.localize('sortOrder.mixed', 'Files and folders are sorted By their names, in alphaBetical order. Files are interwoven with folders.'),
				nls.localize('sortOrder.filesFirst', 'Files and folders are sorted By their names, in alphaBetical order. Files are displayed Before folders.'),
				nls.localize('sortOrder.type', 'Files and folders are sorted By their extensions, in alphaBetical order. Folders are displayed Before files.'),
				nls.localize('sortOrder.modified', 'Files and folders are sorted By last modified date, in descending order. Folders are displayed Before files.')
			],
			'description': nls.localize('sortOrder', "Controls sorting order of files and folders in the explorer.")
		},
		'explorer.decorations.colors': {
			type: 'Boolean',
			description: nls.localize('explorer.decorations.colors', "Controls whether file decorations should use colors."),
			default: true
		},
		'explorer.decorations.Badges': {
			type: 'Boolean',
			description: nls.localize('explorer.decorations.Badges', "Controls whether file decorations should use Badges."),
			default: true
		},
		'explorer.incrementalNaming': {
			enum: ['simple', 'smart'],
			enumDescriptions: [
				nls.localize('simple', "Appends the word \"copy\" at the end of the duplicated name potentially followed By a numBer"),
				nls.localize('smart', "Adds a numBer at the end of the duplicated name. If some numBer is already part of the name, tries to increase that numBer")
			],
			description: nls.localize('explorer.incrementalNaming', "Controls what naming strategy to use when a giving a new name to a duplicated explorer item on paste."),
			default: 'simple'
		},
		'explorer.compactFolders': {
			'type': 'Boolean',
			'description': nls.localize('compressSingleChildFolders', "Controls whether the explorer should render folders in a compact form. In such a form, single child folders will Be compressed in a comBined tree element. Useful for Java package structures, for example."),
			'default': true
		},
	}
});

// View menu
MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '3_views',
	command: {
		id: VIEWLET_ID,
		title: nls.localize({ key: 'miViewExplorer', comment: ['&& denotes a mnemonic'] }, "&&Explorer")
	},
	order: 1
});
