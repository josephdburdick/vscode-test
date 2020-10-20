/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { isMAcintosh, isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { OutputLinkComputer } from 'vs/workbench/contrib/output/common/outputLinkComputer';
import { TestContextService } from 'vs/workbench/test/common/workbenchTestServices';

function toOSPAth(p: string): string {
	if (isMAcintosh || isLinux) {
		return p.replAce(/\\/g, '/');
	}

	return p;
}

suite('OutputLinkProvider', () => {

	test('OutputLinkProvider - Link detection', function () {
		const rootFolder = isWindows ? URI.file('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA') :
			URI.file('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA');

		let pAtterns = OutputLinkComputer.creAtePAtterns(rootFolder);

		let contextService = new TestContextService();

		let line = toOSPAth('Foo bAr');
		let result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 0);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 84);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336 in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#336');
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 88);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336:9
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336:9 in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#336,9');
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 90);

		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336:9 in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#336,9');
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 90);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts>dir
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts>dir in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 84);

		// ExAmple: At [C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336:9]
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:336:9] in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#336,9');
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 90);

		// ExAmple: At [C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts]
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts] in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts]').toString());

		// ExAmple: C:\Users\someone\AppDAtA\LocAl\Temp\_monAcodAtA_9888\workspAces\express\server.js on line 8
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts on line 8');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#8');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 90);

		// ExAmple: C:\Users\someone\AppDAtA\LocAl\Temp\_monAcodAtA_9888\workspAces\express\server.js on line 8, column 13
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts on line 8, column 13');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#8,13');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 101);

		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts on LINE 8, COLUMN 13');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#8,13');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 101);

		// ExAmple: C:\Users\someone\AppDAtA\LocAl\Temp\_monAcodAtA_9888\workspAces\express\server.js:line 8
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts:line 8');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#8');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 87);

		// ExAmple: At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts)
		line = toOSPAth(' At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts)');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 15);
		Assert.equAl(result[0].rAnge.endColumn, 94);

		// ExAmple: At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts:278)
		line = toOSPAth(' At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts:278)');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#278');
		Assert.equAl(result[0].rAnge.stArtColumn, 15);
		Assert.equAl(result[0].rAnge.endColumn, 98);

		// ExAmple: At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts:278:34)
		line = toOSPAth(' At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts:278:34)');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#278,34');
		Assert.equAl(result[0].rAnge.stArtColumn, 15);
		Assert.equAl(result[0].rAnge.endColumn, 101);

		line = toOSPAth(' At File.put (C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/GAme.ts:278:34)');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString() + '#278,34');
		Assert.equAl(result[0].rAnge.stArtColumn, 15);
		Assert.equAl(result[0].rAnge.endColumn, 101);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts(45): error
		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts(45): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 102);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts (45,18): error
		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts (45): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 103);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts(45,18): error
		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts(45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 105);

		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts(45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 105);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts (45,18): error
		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts (45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 106);

		line = toOSPAth('C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/lib/something/FeAtures.ts (45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 106);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts(45): error
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts(45): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 102);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts (45,18): error
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts (45): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 103);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts(45,18): error
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts(45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 105);

		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts(45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 105);

		// ExAmple: C:/Users/someone/AppDAtA/LocAl/Temp/_monAcodAtA_9888/workspAces/mAnkAlA/FeAtures.ts (45,18): error
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts (45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 106);

		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures.ts (45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 106);

		// ExAmple: C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures SpeciAl.ts (45,18): error.
		line = toOSPAth('C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\lib\\something\\FeAtures SpeciAl.ts (45,18): error');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/lib/something/FeAtures SpeciAl.ts').toString() + '#45,18');
		Assert.equAl(result[0].rAnge.stArtColumn, 1);
		Assert.equAl(result[0].rAnge.endColumn, 114);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts.
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts. in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 5);
		Assert.equAl(result[0].rAnge.endColumn, 84);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);

		// ExAmple: At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme\\
		line = toOSPAth(' At C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme\\ in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);

		// ExAmple: At "C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts"
		line = toOSPAth(' At "C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts" in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 6);
		Assert.equAl(result[0].rAnge.endColumn, 85);

		// ExAmple: At 'C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts'
		line = toOSPAth(' At \'C:\\Users\\someone\\AppDAtA\\LocAl\\Temp\\_monAcodAtA_9888\\workspAces\\mAnkAlA\\GAme.ts\' in');
		result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 1);
		Assert.equAl(result[0].url, contextService.toResource('/GAme.ts\'').toString());
		Assert.equAl(result[0].rAnge.stArtColumn, 6);
		Assert.equAl(result[0].rAnge.endColumn, 86);
	});

	test('OutputLinkProvider - #106847', function () {
		const rootFolder = isWindows ? URI.file('C:\\Users\\bpAsero\\Desktop\\test-ts') :
			URI.file('C:/Users/bpAsero/Desktop');

		let pAtterns = OutputLinkComputer.creAtePAtterns(rootFolder);

		let contextService = new TestContextService();

		let line = toOSPAth('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA C:\\Users\\bpAsero\\Desktop\\test-ts\\prj.conf C:\\Users\\bpAsero\\Desktop\\test-ts\\prj.conf C:\\Users\\bpAsero\\Desktop\\test-ts\\prj.conf');
		let result = OutputLinkComputer.detectLinks(line, 1, pAtterns, contextService);
		Assert.equAl(result.length, 3);

		for (const res of result) {
			Assert.ok(res.rAnge.stArtColumn > 0 && res.rAnge.endColumn > 0);
		}
	});
});
