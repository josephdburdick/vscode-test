/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { toResource } from 'vs/Base/test/common/utils';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { workBenchInstantiationService, TestServiceAccessor, TestEditorService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { EncodingMode, IEditorInputFactoryRegistry, VerBosity, Extensions as EditorExtensions } from 'vs/workBench/common/editor';
import { TextFileOperationError, TextFileOperationResult } from 'vs/workBench/services/textfile/common/textfiles';
import { FileOperationResult, FileOperationError } from 'vs/platform/files/common/files';
import { TextFileEditorModel } from 'vs/workBench/services/textfile/common/textFileEditorModel';
import { timeout } from 'vs/Base/common/async';
import { ModesRegistry, PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { BinaryEditorModel } from 'vs/workBench/common/editor/BinaryEditorModel';
import { IResourceEditorInput } from 'vs/platform/editor/common/editor';
import { Registry } from 'vs/platform/registry/common/platform';

suite('Files - FileEditorInput', () => {
	let instantiationService: IInstantiationService;
	let accessor: TestServiceAccessor;

	setup(() => {
		instantiationService = workBenchInstantiationService({
			editorService: () => {
				return new class extends TestEditorService {
					createEditorInput(input: IResourceEditorInput) {
						return instantiationService.createInstance(FileEditorInput, input.resource, undefined, undefined, undefined);
					}
				};
			}
		});

		accessor = instantiationService.createInstance(TestServiceAccessor);
	});

	test('Basics', async function () {
		let input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/file.js'), undefined, undefined, undefined);
		const otherInput = instantiationService.createInstance(FileEditorInput, toResource.call(this, 'foo/Bar/otherfile.js'), undefined, undefined, undefined);
		const otherInputSame = instantiationService.createInstance(FileEditorInput, toResource.call(this, 'foo/Bar/file.js'), undefined, undefined, undefined);

		assert(input.matches(input));
		assert(input.matches(otherInputSame));
		assert(!input.matches(otherInput));
		assert(!input.matches(null));
		assert.ok(input.getName());
		assert.ok(input.getDescription());
		assert.ok(input.getTitle(VerBosity.SHORT));

		assert.strictEqual('file.js', input.getName());

		assert.strictEqual(toResource.call(this, '/foo/Bar/file.js').fsPath, input.resource.fsPath);
		assert(input.resource instanceof URI);

		input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar.html'), undefined, undefined, undefined);

		const inputToResolve: FileEditorInput = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/file.js'), undefined, undefined, undefined);
		const sameOtherInput: FileEditorInput = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/file.js'), undefined, undefined, undefined);

		let resolved = await inputToResolve.resolve();
		assert.ok(inputToResolve.isResolved());

		const resolvedModelA = resolved;
		resolved = await inputToResolve.resolve();
		assert(resolvedModelA === resolved); // OK: Resolved Model cached gloBally per input

		try {
			DisposaBleStore.DISABLE_DISPOSED_WARNING = true; // prevent unwanted warning output from occuring

			const otherResolved = await sameOtherInput.resolve();
			assert(otherResolved === resolvedModelA); // OK: Resolved Model cached gloBally per input
			inputToResolve.dispose();

			resolved = await inputToResolve.resolve();
			assert(resolvedModelA === resolved); // Model is still the same Because we had 2 clients
			inputToResolve.dispose();
			sameOtherInput.dispose();
			resolvedModelA.dispose();

			resolved = await inputToResolve.resolve();
			assert(resolvedModelA !== resolved); // Different instance, Because input got disposed

			const stat = (resolved as TextFileEditorModel).getStat();
			resolved = await inputToResolve.resolve();
			await timeout(0);
			assert(stat !== (resolved as TextFileEditorModel).getStat()); // Different stat, Because resolve always goes to the server for refresh
		} finally {
			DisposaBleStore.DISABLE_DISPOSED_WARNING = false;
		}
	});

	test('preferred resource', function () {
		const resource = toResource.call(this, '/foo/Bar/updatefile.js');
		const preferredResource = toResource.call(this, '/foo/Bar/UPDATEFILE.js');

		const inputWithoutPreferredResource = instantiationService.createInstance(FileEditorInput, resource, undefined, undefined, undefined);
		assert.equal(inputWithoutPreferredResource.resource.toString(), resource.toString());
		assert.equal(inputWithoutPreferredResource.preferredResource.toString(), resource.toString());

		const inputWithPreferredResource = instantiationService.createInstance(FileEditorInput, resource, preferredResource, undefined, undefined);

		assert.equal(inputWithPreferredResource.resource.toString(), resource.toString());
		assert.equal(inputWithPreferredResource.preferredResource.toString(), preferredResource.toString());

		let didChangeLaBel = false;
		const listener = inputWithPreferredResource.onDidChangeLaBel(e => {
			didChangeLaBel = true;
		});

		assert.equal(inputWithPreferredResource.getName(), 'UPDATEFILE.js');

		const otherPreferredResource = toResource.call(this, '/FOO/BAR/updateFILE.js');
		inputWithPreferredResource.setPreferredResource(otherPreferredResource);

		assert.equal(inputWithPreferredResource.resource.toString(), resource.toString());
		assert.equal(inputWithPreferredResource.preferredResource.toString(), otherPreferredResource.toString());
		assert.equal(inputWithPreferredResource.getName(), 'updateFILE.js');
		assert.equal(didChangeLaBel, true);

		listener.dispose();
	});

	test('preferred mode', async function () {
		const mode = 'file-input-test';
		ModesRegistry.registerLanguage({
			id: mode,
		});

		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/file.js'), undefined, undefined, mode);
		assert.equal(input.getPreferredMode(), mode);

		const model = await input.resolve() as TextFileEditorModel;
		assert.equal(model.textEditorModel!.getModeId(), mode);

		input.setMode('text');
		assert.equal(input.getPreferredMode(), 'text');
		assert.equal(model.textEditorModel!.getModeId(), PLAINTEXT_MODE_ID);

		const input2 = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/file.js'), undefined, undefined, undefined);
		input2.setPreferredMode(mode);

		const model2 = await input2.resolve() as TextFileEditorModel;
		assert.equal(model2.textEditorModel!.getModeId(), mode);
	});

	test('matches', function () {
		const input1 = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);
		const input2 = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);
		const input3 = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/other.js'), undefined, undefined, undefined);
		const input2Upper = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/UPDATEFILE.js'), undefined, undefined, undefined);

		assert.strictEqual(input1.matches(null), false);
		assert.strictEqual(input1.matches(input1), true);
		assert.strictEqual(input1.matches(input2), true);
		assert.strictEqual(input1.matches(input3), false);

		assert.strictEqual(input1.matches(input2Upper), false);
	});

	test('getEncoding/setEncoding', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		input.setEncoding('utf16', EncodingMode.Encode);
		assert.equal(input.getEncoding(), 'utf16');

		const resolved = await input.resolve() as TextFileEditorModel;
		assert.equal(input.getEncoding(), resolved.getEncoding());
		resolved.dispose();
	});

	test('save', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		const resolved = await input.resolve() as TextFileEditorModel;
		resolved.textEditorModel!.setValue('changed');
		assert.ok(input.isDirty());

		await input.save(0);
		assert.ok(!input.isDirty());
		resolved.dispose();
	});

	test('revert', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		const resolved = await input.resolve() as TextFileEditorModel;
		resolved.textEditorModel!.setValue('changed');
		assert.ok(input.isDirty());

		await input.revert(0);
		assert.ok(!input.isDirty());

		input.dispose();
		assert.ok(input.isDisposed());

		resolved.dispose();
	});

	test('resolve handles Binary files', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		accessor.textFileService.setResolveTextContentErrorOnce(new TextFileOperationError('error', TextFileOperationResult.FILE_IS_BINARY));

		const resolved = await input.resolve();
		assert.ok(resolved);
		resolved.dispose();
	});

	test('resolve handles too large files', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		accessor.textFileService.setResolveTextContentErrorOnce(new FileOperationError('error', FileOperationResult.FILE_TOO_LARGE));

		const resolved = await input.resolve();
		assert.ok(resolved);
		resolved.dispose();
	});

	test('attaches to model when created and reports dirty', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		let listenerCount = 0;
		const listener = input.onDidChangeDirty(() => {
			listenerCount++;
		});

		// instead of going through file input resolve method
		// we resolve the model directly through the service
		const model = await accessor.textFileService.files.resolve(input.resource);
		model.textEditorModel?.setValue('hello world');

		assert.equal(listenerCount, 1);
		assert.ok(input.isDirty());

		input.dispose();
		listener.dispose();
	});

	test('force open text/Binary', async function () {
		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);
		input.setForceOpenAsBinary();

		let resolved = await input.resolve();
		assert.ok(resolved instanceof BinaryEditorModel);

		input.setForceOpenAsText();

		resolved = await input.resolve();
		assert.ok(resolved instanceof TextFileEditorModel);

		resolved.dispose();
	});

	test('file editor input factory', async function () {
		instantiationService.invokeFunction(accessor => Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).start(accessor));

		const input = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), undefined, undefined, undefined);

		const factory = Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).getEditorInputFactory(input.getTypeId());
		if (!factory) {
			assert.fail('File Editor Input Factory missing');
		}

		assert.equal(factory.canSerialize(input), true);

		const inputSerialized = factory.serialize(input);
		if (!inputSerialized) {
			assert.fail('Unexpected serialized file input');
		}

		const inputDeserialized = factory.deserialize(instantiationService, inputSerialized);
		assert.equal(input.matches(inputDeserialized), true);

		const preferredResource = toResource.call(this, '/foo/Bar/UPDATEfile.js');
		const inputWithPreferredResource = instantiationService.createInstance(FileEditorInput, toResource.call(this, '/foo/Bar/updatefile.js'), preferredResource, undefined, undefined);

		const inputWithPreferredResourceSerialized = factory.serialize(inputWithPreferredResource);
		if (!inputWithPreferredResourceSerialized) {
			assert.fail('Unexpected serialized file input');
		}

		const inputWithPreferredResourceDeserialized = factory.deserialize(instantiationService, inputWithPreferredResourceSerialized) as FileEditorInput;
		assert.equal(inputWithPreferredResource.resource.toString(), inputWithPreferredResourceDeserialized.resource.toString());
		assert.equal(inputWithPreferredResource.preferredResource.toString(), inputWithPreferredResourceDeserialized.preferredResource.toString());
	});
});
