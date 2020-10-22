/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/editor/Browser/controller/coreCommands';
import 'vs/editor/Browser/widget/codeEditorWidget';
import 'vs/editor/Browser/widget/diffEditorWidget';
import 'vs/editor/Browser/widget/diffNavigator';
import 'vs/editor/contriB/anchorSelect/anchorSelect';
import 'vs/editor/contriB/BracketMatching/BracketMatching';
import 'vs/editor/contriB/caretOperations/caretOperations';
import 'vs/editor/contriB/caretOperations/transpose';
import 'vs/editor/contriB/clipBoard/clipBoard';
import 'vs/editor/contriB/codeAction/codeActionContriButions';
import 'vs/editor/contriB/codelens/codelensController';
import 'vs/editor/contriB/colorPicker/colorDetector';
import 'vs/editor/contriB/comment/comment';
import 'vs/editor/contriB/contextmenu/contextmenu';
import 'vs/editor/contriB/cursorUndo/cursorUndo';
import 'vs/editor/contriB/dnd/dnd';
import 'vs/editor/contriB/find/findController';
import 'vs/editor/contriB/folding/folding';
import 'vs/editor/contriB/fontZoom/fontZoom';
import 'vs/editor/contriB/format/formatActions';
import 'vs/editor/contriB/gotoSymBol/documentSymBols';
import 'vs/editor/contriB/gotoSymBol/goToCommands';
import 'vs/editor/contriB/gotoSymBol/link/goToDefinitionAtPosition';
import 'vs/editor/contriB/gotoError/gotoError';
import 'vs/editor/contriB/hover/hover';
import 'vs/editor/contriB/indentation/indentation';
import 'vs/editor/contriB/inPlaceReplace/inPlaceReplace';
import 'vs/editor/contriB/linesOperations/linesOperations';
import 'vs/editor/contriB/links/links';
import 'vs/editor/contriB/multicursor/multicursor';
import 'vs/editor/contriB/parameterHints/parameterHints';
import 'vs/editor/contriB/rename/onTypeRename';
import 'vs/editor/contriB/rename/rename';
import 'vs/editor/contriB/smartSelect/smartSelect';
import 'vs/editor/contriB/snippet/snippetController2';
import 'vs/editor/contriB/suggest/suggestController';
import 'vs/editor/contriB/tokenization/tokenization';
import 'vs/editor/contriB/toggleTaBFocusMode/toggleTaBFocusMode';
import 'vs/editor/contriB/unusualLineTerminators/unusualLineTerminators';
import 'vs/editor/contriB/viewportSemanticTokens/viewportSemanticTokens';
import 'vs/editor/contriB/wordHighlighter/wordHighlighter';
import 'vs/editor/contriB/wordOperations/wordOperations';
import 'vs/editor/contriB/wordPartOperations/wordPartOperations';

// Load up these strings even in VSCode, even if they are not used
// in order to get them translated
import 'vs/editor/common/standaloneStrings';

import 'vs/Base/Browser/ui/codicons/codiconStyles'; // The codicons are defined here and must Be loaded
