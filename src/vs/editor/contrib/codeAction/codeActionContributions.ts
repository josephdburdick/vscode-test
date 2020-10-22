/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerEditorAction, registerEditorCommand, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { CodeActionCommand, OrganizeImportsAction, QuickFixAction, QuickFixController, RefactorAction, SourceAction, AutoFixAction, FixAllAction } from 'vs/editor/contriB/codeAction/codeActionCommands';


registerEditorContriBution(QuickFixController.ID, QuickFixController);
registerEditorAction(QuickFixAction);
registerEditorAction(RefactorAction);
registerEditorAction(SourceAction);
registerEditorAction(OrganizeImportsAction);
registerEditorAction(AutoFixAction);
registerEditorAction(FixAllAction);
registerEditorCommand(new CodeActionCommand());
