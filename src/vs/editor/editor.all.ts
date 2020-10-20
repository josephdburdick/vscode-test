/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/editor/browser/controller/coreCommAnds';
import 'vs/editor/browser/widget/codeEditorWidget';
import 'vs/editor/browser/widget/diffEditorWidget';
import 'vs/editor/browser/widget/diffNAvigAtor';
import 'vs/editor/contrib/AnchorSelect/AnchorSelect';
import 'vs/editor/contrib/brAcketMAtching/brAcketMAtching';
import 'vs/editor/contrib/cAretOperAtions/cAretOperAtions';
import 'vs/editor/contrib/cAretOperAtions/trAnspose';
import 'vs/editor/contrib/clipboArd/clipboArd';
import 'vs/editor/contrib/codeAction/codeActionContributions';
import 'vs/editor/contrib/codelens/codelensController';
import 'vs/editor/contrib/colorPicker/colorDetector';
import 'vs/editor/contrib/comment/comment';
import 'vs/editor/contrib/contextmenu/contextmenu';
import 'vs/editor/contrib/cursorUndo/cursorUndo';
import 'vs/editor/contrib/dnd/dnd';
import 'vs/editor/contrib/find/findController';
import 'vs/editor/contrib/folding/folding';
import 'vs/editor/contrib/fontZoom/fontZoom';
import 'vs/editor/contrib/formAt/formAtActions';
import 'vs/editor/contrib/gotoSymbol/documentSymbols';
import 'vs/editor/contrib/gotoSymbol/goToCommAnds';
import 'vs/editor/contrib/gotoSymbol/link/goToDefinitionAtPosition';
import 'vs/editor/contrib/gotoError/gotoError';
import 'vs/editor/contrib/hover/hover';
import 'vs/editor/contrib/indentAtion/indentAtion';
import 'vs/editor/contrib/inPlAceReplAce/inPlAceReplAce';
import 'vs/editor/contrib/linesOperAtions/linesOperAtions';
import 'vs/editor/contrib/links/links';
import 'vs/editor/contrib/multicursor/multicursor';
import 'vs/editor/contrib/pArAmeterHints/pArAmeterHints';
import 'vs/editor/contrib/renAme/onTypeRenAme';
import 'vs/editor/contrib/renAme/renAme';
import 'vs/editor/contrib/smArtSelect/smArtSelect';
import 'vs/editor/contrib/snippet/snippetController2';
import 'vs/editor/contrib/suggest/suggestController';
import 'vs/editor/contrib/tokenizAtion/tokenizAtion';
import 'vs/editor/contrib/toggleTAbFocusMode/toggleTAbFocusMode';
import 'vs/editor/contrib/unusuAlLineTerminAtors/unusuAlLineTerminAtors';
import 'vs/editor/contrib/viewportSemAnticTokens/viewportSemAnticTokens';
import 'vs/editor/contrib/wordHighlighter/wordHighlighter';
import 'vs/editor/contrib/wordOperAtions/wordOperAtions';
import 'vs/editor/contrib/wordPArtOperAtions/wordPArtOperAtions';

// LoAd up these strings even in VSCode, even if they Are not used
// in order to get them trAnslAted
import 'vs/editor/common/stAndAloneStrings';

import 'vs/bAse/browser/ui/codicons/codiconStyles'; // The codicons Are defined here And must be loAded
