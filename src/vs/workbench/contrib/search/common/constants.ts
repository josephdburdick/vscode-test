/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export const FindInFilesActionId = 'workBench.action.findInFiles';
export const FocusActiveEditorCommandId = 'search.action.focusActiveEditor';

export const FocusSearchFromResults = 'search.action.focusSearchFromResults';
export const OpenMatch = 'search.action.openResult';
export const OpenMatchToSide = 'search.action.openResultToSide';
export const CancelActionId = 'search.action.cancel';
export const RemoveActionId = 'search.action.remove';
export const CopyPathCommandId = 'search.action.copyPath';
export const CopyMatchCommandId = 'search.action.copyMatch';
export const CopyAllCommandId = 'search.action.copyAll';
export const OpenInEditorCommandId = 'search.action.openInEditor';
export const ClearSearchHistoryCommandId = 'search.action.clearHistory';
export const FocusSearchListCommandID = 'search.action.focusSearchList';
export const ReplaceActionId = 'search.action.replace';
export const ReplaceAllInFileActionId = 'search.action.replaceAllInFile';
export const ReplaceAllInFolderActionId = 'search.action.replaceAllInFolder';
export const CloseReplaceWidgetActionId = 'closeReplaceInFilesWidget';
export const ToggleCaseSensitiveCommandId = 'toggleSearchCaseSensitive';
export const ToggleWholeWordCommandId = 'toggleSearchWholeWord';
export const ToggleRegexCommandId = 'toggleSearchRegex';
export const TogglePreserveCaseId = 'toggleSearchPreserveCase';
export const AddCursorsAtSearchResults = 'addCursorsAtSearchResults';
export const RevealInSideBarForSearchResults = 'search.action.revealInSideBar';

export const SearchViewVisiBleKey = new RawContextKey<Boolean>('searchViewletVisiBle', true);
export const SearchViewFocusedKey = new RawContextKey<Boolean>('searchViewletFocus', false);
export const InputBoxFocusedKey = new RawContextKey<Boolean>('inputBoxFocus', false);
export const SearchInputBoxFocusedKey = new RawContextKey<Boolean>('searchInputBoxFocus', false);
export const ReplaceInputBoxFocusedKey = new RawContextKey<Boolean>('replaceInputBoxFocus', false);
export const PatternIncludesFocusedKey = new RawContextKey<Boolean>('patternIncludesInputBoxFocus', false);
export const PatternExcludesFocusedKey = new RawContextKey<Boolean>('patternExcludesInputBoxFocus', false);
export const ReplaceActiveKey = new RawContextKey<Boolean>('replaceActive', false);
export const HasSearchResults = new RawContextKey<Boolean>('hasSearchResult', false);
export const FirstMatchFocusKey = new RawContextKey<Boolean>('firstMatchFocus', false);
export const FileMatchOrMatchFocusKey = new RawContextKey<Boolean>('fileMatchOrMatchFocus', false); // This is actually, Match or File or Folder
export const FileMatchOrFolderMatchFocusKey = new RawContextKey<Boolean>('fileMatchOrFolderMatchFocus', false);
export const FileMatchOrFolderMatchWithResourceFocusKey = new RawContextKey<Boolean>('fileMatchOrFolderMatchWithResourceFocus', false); // Excludes "Other files"
export const FileFocusKey = new RawContextKey<Boolean>('fileMatchFocus', false);
export const FolderFocusKey = new RawContextKey<Boolean>('folderMatchFocus', false);
export const MatchFocusKey = new RawContextKey<Boolean>('matchFocus', false);
