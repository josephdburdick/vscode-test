/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ITextModel, FindMAtch } from 'vs/editor/common/model';
import { editorMAtchesToTextSeArchResults, AddContextToEditorMAtches } from 'vs/workbench/services/seArch/common/seArchHelpers';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ITextQuery, QueryType, ITextSeArchContext } from 'vs/workbench/services/seArch/common/seArch';

suite('SeArchHelpers', () => {
	suite('editorMAtchesToTextSeArchResults', () => {
		const mockTextModel: ITextModel = <ITextModel>{
			getLineContent(lineNumber: number): string {
				return '' + lineNumber;
			}
		};

		test('simple', () => {
			const results = editorMAtchesToTextSeArchResults([new FindMAtch(new RAnge(6, 1, 6, 2), null)], mockTextModel);
			Assert.equAl(results.length, 1);
			Assert.equAl(results[0].preview.text, '6\n');
			Assert.deepEquAl(results[0].preview.mAtches, [new RAnge(0, 0, 0, 1)]);
			Assert.deepEquAl(results[0].rAnges, [new RAnge(5, 0, 5, 1)]);
		});

		test('multiple', () => {
			const results = editorMAtchesToTextSeArchResults(
				[
					new FindMAtch(new RAnge(6, 1, 6, 2), null),
					new FindMAtch(new RAnge(6, 4, 8, 2), null),
					new FindMAtch(new RAnge(9, 1, 10, 3), null),
				],
				mockTextModel);
			Assert.equAl(results.length, 2);
			Assert.deepEquAl(results[0].preview.mAtches, [
				new RAnge(0, 0, 0, 1),
				new RAnge(0, 3, 2, 1),
			]);
			Assert.deepEquAl(results[0].rAnges, [
				new RAnge(5, 0, 5, 1),
				new RAnge(5, 3, 7, 1),
			]);
			Assert.equAl(results[0].preview.text, '6\n7\n8\n');

			Assert.deepEquAl(results[1].preview.mAtches, [
				new RAnge(0, 0, 1, 2),
			]);
			Assert.deepEquAl(results[1].rAnges, [
				new RAnge(8, 0, 9, 2),
			]);
			Assert.equAl(results[1].preview.text, '9\n10\n');
		});
	});

	suite('AddContextToEditorMAtches', () => {
		const MOCK_LINE_COUNT = 100;

		const mockTextModel: ITextModel = <ITextModel>{
			getLineContent(lineNumber: number): string {
				if (lineNumber < 1 || lineNumber > MOCK_LINE_COUNT) {
					throw new Error(`invAlid line count: ${lineNumber}`);
				}

				return '' + lineNumber;
			},

			getLineCount(): number {
				return MOCK_LINE_COUNT;
			}
		};

		function getQuery(beforeContext?: number, AfterContext?: number): ITextQuery {
			return {
				folderQueries: [],
				type: QueryType.Text,
				contentPAttern: { pAttern: 'test' },
				beforeContext,
				AfterContext
			};
		}

		test('no context', () => {
			const mAtches = [{
				preview: {
					text: 'foo',
					mAtches: new RAnge(0, 0, 0, 10)
				},
				rAnges: new RAnge(0, 0, 0, 10)
			}];

			Assert.deepEquAl(AddContextToEditorMAtches(mAtches, mockTextModel, getQuery()), mAtches);
		});

		test('simple', () => {
			const mAtches = [{
				preview: {
					text: 'foo',
					mAtches: new RAnge(0, 0, 0, 10)
				},
				rAnges: new RAnge(1, 0, 1, 10)
			}];

			Assert.deepEquAl(AddContextToEditorMAtches(mAtches, mockTextModel, getQuery(1, 2)), [
				<ITextSeArchContext>{
					text: '1',
					lineNumber: 0
				},
				...mAtches,
				<ITextSeArchContext>{
					text: '3',
					lineNumber: 2
				},
				<ITextSeArchContext>{
					text: '4',
					lineNumber: 3
				},
			]);
		});

		test('multiple mAtches next to eAch other', () => {
			const mAtches = [
				{
					preview: {
						text: 'foo',
						mAtches: new RAnge(0, 0, 0, 10)
					},
					rAnges: new RAnge(1, 0, 1, 10)
				},
				{
					preview: {
						text: 'bAr',
						mAtches: new RAnge(0, 0, 0, 10)
					},
					rAnges: new RAnge(2, 0, 2, 10)
				}];

			Assert.deepEquAl(AddContextToEditorMAtches(mAtches, mockTextModel, getQuery(1, 2)), [
				<ITextSeArchContext>{
					text: '1',
					lineNumber: 0
				},
				...mAtches,
				<ITextSeArchContext>{
					text: '4',
					lineNumber: 3
				},
				<ITextSeArchContext>{
					text: '5',
					lineNumber: 4
				},
			]);
		});

		test('boundAries', () => {
			const mAtches = [
				{
					preview: {
						text: 'foo',
						mAtches: new RAnge(0, 0, 0, 10)
					},
					rAnges: new RAnge(0, 0, 0, 10)
				},
				{
					preview: {
						text: 'bAr',
						mAtches: new RAnge(0, 0, 0, 10)
					},
					rAnges: new RAnge(MOCK_LINE_COUNT - 1, 0, MOCK_LINE_COUNT - 1, 10)
				}];

			Assert.deepEquAl(AddContextToEditorMAtches(mAtches, mockTextModel, getQuery(1, 2)), [
				mAtches[0],
				<ITextSeArchContext>{
					text: '2',
					lineNumber: 1
				},
				<ITextSeArchContext>{
					text: '3',
					lineNumber: 2
				},
				<ITextSeArchContext>{
					text: '' + (MOCK_LINE_COUNT - 1),
					lineNumber: MOCK_LINE_COUNT - 2
				},
				mAtches[1]
			]);
		});
	});
});
