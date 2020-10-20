/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { toResource } from 'vs/bAse/test/common/utils';
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { workbenchInstAntiAtionService, TestServiceAccessor, TestEditorService } from 'vs/workbench/test/browser/workbenchTestServices';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { EncodingMode, IEditorInputFActoryRegistry, Verbosity, Extensions As EditorExtensions } from 'vs/workbench/common/editor';
import { TextFileOperAtionError, TextFileOperAtionResult } from 'vs/workbench/services/textfile/common/textfiles';
import { FileOperAtionResult, FileOperAtionError } from 'vs/plAtform/files/common/files';
import { TextFileEditorModel } from 'vs/workbench/services/textfile/common/textFileEditorModel';
import { timeout } from 'vs/bAse/common/Async';
import { ModesRegistry, PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { BinAryEditorModel } from 'vs/workbench/common/editor/binAryEditorModel';
import { IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { Registry } from 'vs/plAtform/registry/common/plAtform';

suite('Files - FileEditorInput', () => {
	let instAntiAtionService: IInstAntiAtionService;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService({
			editorService: () => {
				return new clAss extends TestEditorService {
					creAteEditorInput(input: IResourceEditorInput) {
						return instAntiAtionService.creAteInstAnce(FileEditorInput, input.resource, undefined, undefined, undefined);
					}
				};
			}
		});

		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	test('BAsics', Async function () {
		let input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/file.js'), undefined, undefined, undefined);
		const otherInput = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, 'foo/bAr/otherfile.js'), undefined, undefined, undefined);
		const otherInputSAme = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, 'foo/bAr/file.js'), undefined, undefined, undefined);

		Assert(input.mAtches(input));
		Assert(input.mAtches(otherInputSAme));
		Assert(!input.mAtches(otherInput));
		Assert(!input.mAtches(null));
		Assert.ok(input.getNAme());
		Assert.ok(input.getDescription());
		Assert.ok(input.getTitle(Verbosity.SHORT));

		Assert.strictEquAl('file.js', input.getNAme());

		Assert.strictEquAl(toResource.cAll(this, '/foo/bAr/file.js').fsPAth, input.resource.fsPAth);
		Assert(input.resource instAnceof URI);

		input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr.html'), undefined, undefined, undefined);

		const inputToResolve: FileEditorInput = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/file.js'), undefined, undefined, undefined);
		const sAmeOtherInput: FileEditorInput = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/file.js'), undefined, undefined, undefined);

		let resolved = AwAit inputToResolve.resolve();
		Assert.ok(inputToResolve.isResolved());

		const resolvedModelA = resolved;
		resolved = AwAit inputToResolve.resolve();
		Assert(resolvedModelA === resolved); // OK: Resolved Model cAched globAlly per input

		try {
			DisposAbleStore.DISABLE_DISPOSED_WARNING = true; // prevent unwAnted wArning output from occuring

			const otherResolved = AwAit sAmeOtherInput.resolve();
			Assert(otherResolved === resolvedModelA); // OK: Resolved Model cAched globAlly per input
			inputToResolve.dispose();

			resolved = AwAit inputToResolve.resolve();
			Assert(resolvedModelA === resolved); // Model is still the sAme becAuse we hAd 2 clients
			inputToResolve.dispose();
			sAmeOtherInput.dispose();
			resolvedModelA.dispose();

			resolved = AwAit inputToResolve.resolve();
			Assert(resolvedModelA !== resolved); // Different instAnce, becAuse input got disposed

			const stAt = (resolved As TextFileEditorModel).getStAt();
			resolved = AwAit inputToResolve.resolve();
			AwAit timeout(0);
			Assert(stAt !== (resolved As TextFileEditorModel).getStAt()); // Different stAt, becAuse resolve AlwAys goes to the server for refresh
		} finAlly {
			DisposAbleStore.DISABLE_DISPOSED_WARNING = fAlse;
		}
	});

	test('preferred resource', function () {
		const resource = toResource.cAll(this, '/foo/bAr/updAtefile.js');
		const preferredResource = toResource.cAll(this, '/foo/bAr/UPDATEFILE.js');

		const inputWithoutPreferredResource = instAntiAtionService.creAteInstAnce(FileEditorInput, resource, undefined, undefined, undefined);
		Assert.equAl(inputWithoutPreferredResource.resource.toString(), resource.toString());
		Assert.equAl(inputWithoutPreferredResource.preferredResource.toString(), resource.toString());

		const inputWithPreferredResource = instAntiAtionService.creAteInstAnce(FileEditorInput, resource, preferredResource, undefined, undefined);

		Assert.equAl(inputWithPreferredResource.resource.toString(), resource.toString());
		Assert.equAl(inputWithPreferredResource.preferredResource.toString(), preferredResource.toString());

		let didChAngeLAbel = fAlse;
		const listener = inputWithPreferredResource.onDidChAngeLAbel(e => {
			didChAngeLAbel = true;
		});

		Assert.equAl(inputWithPreferredResource.getNAme(), 'UPDATEFILE.js');

		const otherPreferredResource = toResource.cAll(this, '/FOO/BAR/updAteFILE.js');
		inputWithPreferredResource.setPreferredResource(otherPreferredResource);

		Assert.equAl(inputWithPreferredResource.resource.toString(), resource.toString());
		Assert.equAl(inputWithPreferredResource.preferredResource.toString(), otherPreferredResource.toString());
		Assert.equAl(inputWithPreferredResource.getNAme(), 'updAteFILE.js');
		Assert.equAl(didChAngeLAbel, true);

		listener.dispose();
	});

	test('preferred mode', Async function () {
		const mode = 'file-input-test';
		ModesRegistry.registerLAnguAge({
			id: mode,
		});

		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/file.js'), undefined, undefined, mode);
		Assert.equAl(input.getPreferredMode(), mode);

		const model = AwAit input.resolve() As TextFileEditorModel;
		Assert.equAl(model.textEditorModel!.getModeId(), mode);

		input.setMode('text');
		Assert.equAl(input.getPreferredMode(), 'text');
		Assert.equAl(model.textEditorModel!.getModeId(), PLAINTEXT_MODE_ID);

		const input2 = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/file.js'), undefined, undefined, undefined);
		input2.setPreferredMode(mode);

		const model2 = AwAit input2.resolve() As TextFileEditorModel;
		Assert.equAl(model2.textEditorModel!.getModeId(), mode);
	});

	test('mAtches', function () {
		const input1 = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);
		const input2 = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);
		const input3 = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/other.js'), undefined, undefined, undefined);
		const input2Upper = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/UPDATEFILE.js'), undefined, undefined, undefined);

		Assert.strictEquAl(input1.mAtches(null), fAlse);
		Assert.strictEquAl(input1.mAtches(input1), true);
		Assert.strictEquAl(input1.mAtches(input2), true);
		Assert.strictEquAl(input1.mAtches(input3), fAlse);

		Assert.strictEquAl(input1.mAtches(input2Upper), fAlse);
	});

	test('getEncoding/setEncoding', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		input.setEncoding('utf16', EncodingMode.Encode);
		Assert.equAl(input.getEncoding(), 'utf16');

		const resolved = AwAit input.resolve() As TextFileEditorModel;
		Assert.equAl(input.getEncoding(), resolved.getEncoding());
		resolved.dispose();
	});

	test('sAve', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		const resolved = AwAit input.resolve() As TextFileEditorModel;
		resolved.textEditorModel!.setVAlue('chAnged');
		Assert.ok(input.isDirty());

		AwAit input.sAve(0);
		Assert.ok(!input.isDirty());
		resolved.dispose();
	});

	test('revert', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		const resolved = AwAit input.resolve() As TextFileEditorModel;
		resolved.textEditorModel!.setVAlue('chAnged');
		Assert.ok(input.isDirty());

		AwAit input.revert(0);
		Assert.ok(!input.isDirty());

		input.dispose();
		Assert.ok(input.isDisposed());

		resolved.dispose();
	});

	test('resolve hAndles binAry files', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		Accessor.textFileService.setResolveTextContentErrorOnce(new TextFileOperAtionError('error', TextFileOperAtionResult.FILE_IS_BINARY));

		const resolved = AwAit input.resolve();
		Assert.ok(resolved);
		resolved.dispose();
	});

	test('resolve hAndles too lArge files', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		Accessor.textFileService.setResolveTextContentErrorOnce(new FileOperAtionError('error', FileOperAtionResult.FILE_TOO_LARGE));

		const resolved = AwAit input.resolve();
		Assert.ok(resolved);
		resolved.dispose();
	});

	test('AttAches to model when creAted And reports dirty', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		let listenerCount = 0;
		const listener = input.onDidChAngeDirty(() => {
			listenerCount++;
		});

		// insteAd of going through file input resolve method
		// we resolve the model directly through the service
		const model = AwAit Accessor.textFileService.files.resolve(input.resource);
		model.textEditorModel?.setVAlue('hello world');

		Assert.equAl(listenerCount, 1);
		Assert.ok(input.isDirty());

		input.dispose();
		listener.dispose();
	});

	test('force open text/binAry', Async function () {
		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);
		input.setForceOpenAsBinAry();

		let resolved = AwAit input.resolve();
		Assert.ok(resolved instAnceof BinAryEditorModel);

		input.setForceOpenAsText();

		resolved = AwAit input.resolve();
		Assert.ok(resolved instAnceof TextFileEditorModel);

		resolved.dispose();
	});

	test('file editor input fActory', Async function () {
		instAntiAtionService.invokeFunction(Accessor => Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).stArt(Accessor));

		const input = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), undefined, undefined, undefined);

		const fActory = Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).getEditorInputFActory(input.getTypeId());
		if (!fActory) {
			Assert.fAil('File Editor Input FActory missing');
		}

		Assert.equAl(fActory.cAnSeriAlize(input), true);

		const inputSeriAlized = fActory.seriAlize(input);
		if (!inputSeriAlized) {
			Assert.fAil('Unexpected seriAlized file input');
		}

		const inputDeseriAlized = fActory.deseriAlize(instAntiAtionService, inputSeriAlized);
		Assert.equAl(input.mAtches(inputDeseriAlized), true);

		const preferredResource = toResource.cAll(this, '/foo/bAr/UPDATEfile.js');
		const inputWithPreferredResource = instAntiAtionService.creAteInstAnce(FileEditorInput, toResource.cAll(this, '/foo/bAr/updAtefile.js'), preferredResource, undefined, undefined);

		const inputWithPreferredResourceSeriAlized = fActory.seriAlize(inputWithPreferredResource);
		if (!inputWithPreferredResourceSeriAlized) {
			Assert.fAil('Unexpected seriAlized file input');
		}

		const inputWithPreferredResourceDeseriAlized = fActory.deseriAlize(instAntiAtionService, inputWithPreferredResourceSeriAlized) As FileEditorInput;
		Assert.equAl(inputWithPreferredResource.resource.toString(), inputWithPreferredResourceDeseriAlized.resource.toString());
		Assert.equAl(inputWithPreferredResource.preferredResource.toString(), inputWithPreferredResourceDeseriAlized.preferredResource.toString());
	});
});
