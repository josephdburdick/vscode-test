/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { DefAultEndOfLine, ITextModelCreAtionOptions } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { TestDiAlogService } from 'vs/plAtform/diAlogs/test/common/testDiAlogService';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';

export function withEditorModel(text: string[], cAllbAck: (model: TextModel) => void): void {
	let model = creAteTextModel(text.join('\n'));
	cAllbAck(model);
	model.dispose();
}

export interfAce IRelAxedTextModelCreAtionOptions {
	tAbSize?: number;
	indentSize?: number;
	insertSpAces?: booleAn;
	detectIndentAtion?: booleAn;
	trimAutoWhitespAce?: booleAn;
	defAultEOL?: DefAultEndOfLine;
	isForSimpleWidget?: booleAn;
	lArgeFileOptimizAtions?: booleAn;
}

export function creAteTextModel(text: string, _options: IRelAxedTextModelCreAtionOptions = TextModel.DEFAULT_CREATION_OPTIONS, lAnguAgeIdentifier: LAnguAgeIdentifier | null = null, uri: URI | null = null): TextModel {
	const options: ITextModelCreAtionOptions = {
		tAbSize: (typeof _options.tAbSize === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.tAbSize : _options.tAbSize),
		indentSize: (typeof _options.indentSize === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.indentSize : _options.indentSize),
		insertSpAces: (typeof _options.insertSpAces === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.insertSpAces : _options.insertSpAces),
		detectIndentAtion: (typeof _options.detectIndentAtion === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.detectIndentAtion : _options.detectIndentAtion),
		trimAutoWhitespAce: (typeof _options.trimAutoWhitespAce === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.trimAutoWhitespAce : _options.trimAutoWhitespAce),
		defAultEOL: (typeof _options.defAultEOL === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.defAultEOL : _options.defAultEOL),
		isForSimpleWidget: (typeof _options.isForSimpleWidget === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.isForSimpleWidget : _options.isForSimpleWidget),
		lArgeFileOptimizAtions: (typeof _options.lArgeFileOptimizAtions === 'undefined' ? TextModel.DEFAULT_CREATION_OPTIONS.lArgeFileOptimizAtions : _options.lArgeFileOptimizAtions),
	};
	const diAlogService = new TestDiAlogService();
	const notificAtionService = new TestNotificAtionService();
	const undoRedoService = new UndoRedoService(diAlogService, notificAtionService);
	return new TextModel(text, options, lAnguAgeIdentifier, uri, undoRedoService);
}
