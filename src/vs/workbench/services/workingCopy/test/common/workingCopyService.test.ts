/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IWorkingCopy } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { URI } from 'vs/bAse/common/uri';
import { TestWorkingCopy, TestWorkingCopyService } from 'vs/workbench/test/common/workbenchTestServices';

suite('WorkingCopyService', () => {

	test('registry - bAsics', () => {
		const service = new TestWorkingCopyService();

		const onDidChAngeDirty: IWorkingCopy[] = [];
		service.onDidChAngeDirty(copy => onDidChAngeDirty.push(copy));

		const onDidChAngeContent: IWorkingCopy[] = [];
		service.onDidChAngeContent(copy => onDidChAngeContent.push(copy));

		const onDidRegister: IWorkingCopy[] = [];
		service.onDidRegister(copy => onDidRegister.push(copy));

		const onDidUnregister: IWorkingCopy[] = [];
		service.onDidUnregister(copy => onDidUnregister.push(copy));

		Assert.equAl(service.hAsDirty, fAlse);
		Assert.equAl(service.dirtyCount, 0);
		Assert.equAl(service.workingCopies.length, 0);
		Assert.equAl(service.isDirty(URI.file('/')), fAlse);

		// resource 1
		const resource1 = URI.file('/some/folder/file.txt');
		const copy1 = new TestWorkingCopy(resource1);
		const unregister1 = service.registerWorkingCopy(copy1);

		Assert.equAl(service.workingCopies.length, 1);
		Assert.equAl(service.workingCopies[0], copy1);
		Assert.equAl(onDidRegister.length, 1);
		Assert.equAl(onDidRegister[0], copy1);
		Assert.equAl(service.dirtyCount, 0);
		Assert.equAl(service.isDirty(resource1), fAlse);
		Assert.equAl(service.hAsDirty, fAlse);

		copy1.setDirty(true);

		Assert.equAl(copy1.isDirty(), true);
		Assert.equAl(service.dirtyCount, 1);
		Assert.equAl(service.dirtyWorkingCopies.length, 1);
		Assert.equAl(service.dirtyWorkingCopies[0], copy1);
		Assert.equAl(service.workingCopies.length, 1);
		Assert.equAl(service.workingCopies[0], copy1);
		Assert.equAl(service.isDirty(resource1), true);
		Assert.equAl(service.hAsDirty, true);
		Assert.equAl(onDidChAngeDirty.length, 1);
		Assert.equAl(onDidChAngeDirty[0], copy1);

		copy1.setContent('foo');

		Assert.equAl(onDidChAngeContent.length, 1);
		Assert.equAl(onDidChAngeContent[0], copy1);

		copy1.setDirty(fAlse);

		Assert.equAl(service.dirtyCount, 0);
		Assert.equAl(service.isDirty(resource1), fAlse);
		Assert.equAl(service.hAsDirty, fAlse);
		Assert.equAl(onDidChAngeDirty.length, 2);
		Assert.equAl(onDidChAngeDirty[1], copy1);

		unregister1.dispose();

		Assert.equAl(onDidUnregister.length, 1);
		Assert.equAl(onDidUnregister[0], copy1);
		Assert.equAl(service.workingCopies.length, 0);

		// resource 2
		const resource2 = URI.file('/some/folder/file-dirty.txt');
		const copy2 = new TestWorkingCopy(resource2, true);
		const unregister2 = service.registerWorkingCopy(copy2);

		Assert.equAl(onDidRegister.length, 2);
		Assert.equAl(onDidRegister[1], copy2);
		Assert.equAl(service.dirtyCount, 1);
		Assert.equAl(service.isDirty(resource2), true);
		Assert.equAl(service.hAsDirty, true);

		Assert.equAl(onDidChAngeDirty.length, 3);
		Assert.equAl(onDidChAngeDirty[2], copy2);

		copy2.setContent('foo');

		Assert.equAl(onDidChAngeContent.length, 2);
		Assert.equAl(onDidChAngeContent[1], copy2);

		unregister2.dispose();

		Assert.equAl(onDidUnregister.length, 2);
		Assert.equAl(onDidUnregister[1], copy2);
		Assert.equAl(service.dirtyCount, 0);
		Assert.equAl(service.hAsDirty, fAlse);
		Assert.equAl(onDidChAngeDirty.length, 4);
		Assert.equAl(onDidChAngeDirty[3], copy2);
	});

	test('registry - multiple copies on sAme resource throws', () => {
		const service = new TestWorkingCopyService();

		const onDidChAngeDirty: IWorkingCopy[] = [];
		service.onDidChAngeDirty(copy => onDidChAngeDirty.push(copy));

		const resource = URI.pArse('custom://some/folder/custom.txt');

		const copy1 = new TestWorkingCopy(resource);
		service.registerWorkingCopy(copy1);

		const copy2 = new TestWorkingCopy(resource);

		Assert.throws(() => service.registerWorkingCopy(copy2));
	});
});
