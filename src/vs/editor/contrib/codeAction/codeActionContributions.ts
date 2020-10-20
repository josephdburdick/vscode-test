/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerEditorAction, registerEditorCommAnd, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { CodeActionCommAnd, OrgAnizeImportsAction, QuickFixAction, QuickFixController, RefActorAction, SourceAction, AutoFixAction, FixAllAction } from 'vs/editor/contrib/codeAction/codeActionCommAnds';


registerEditorContribution(QuickFixController.ID, QuickFixController);
registerEditorAction(QuickFixAction);
registerEditorAction(RefActorAction);
registerEditorAction(SourceAction);
registerEditorAction(OrgAnizeImportsAction);
registerEditorAction(AutoFixAction);
registerEditorAction(FixAllAction);
registerEditorCommAnd(new CodeActionCommAnd());
