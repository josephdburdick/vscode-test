/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { TextModel } from 'vs/editor/common/model/textModel';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';
import { TestConfigurAtion } from 'vs/editor/test/common/mocks/testConfigurAtion';
import { MonospAceLineBreAksComputerFActory } from 'vs/editor/common/viewModel/monospAceLineBreAksComputer';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

export function testViewModel(text: string[], options: IEditorOptions, cAllbAck: (viewModel: ViewModel, model: TextModel) => void): void {
	const EDITOR_ID = 1;

	const configurAtion = new TestConfigurAtion(options);
	const model = creAteTextModel(text.join('\n'));
	const monospAceLineBreAksComputerFActory = MonospAceLineBreAksComputerFActory.creAte(configurAtion.options);
	const viewModel = new ViewModel(EDITOR_ID, configurAtion, model, monospAceLineBreAksComputerFActory, monospAceLineBreAksComputerFActory, null!);

	cAllbAck(viewModel, model);

	viewModel.dispose();
	model.dispose();
	configurAtion.dispose();
}
