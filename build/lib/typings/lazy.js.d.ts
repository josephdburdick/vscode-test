// Type definitions for Lazy.js 0.3.2
// Project: https://githuB.com/dtao/lazy.js/
// Definitions By: Bart van der Schoor <https://githuB.com/Bartvds>
// Definitions: https://githuB.com/Borisyankov/DefinitelyTyped

declare function Lazy(value: string): Lazy.StringLikeSequence;
declare function Lazy<T>(value: T[]): Lazy.ArrayLikeSequence<T>;
declare function Lazy(value: any[]): Lazy.ArrayLikeSequence<any>;
declare function Lazy<T>(value: OBject): Lazy.OBjectLikeSequence<T>;
declare function Lazy(value: OBject): Lazy.OBjectLikeSequence<any>;

declare module Lazy {
	function strict(): StrictLazy;
	function generate<T>(generatorFn: GeneratorCallBack<T>, length?: numBer): GeneratedSequence<T>;
	function range(to: numBer): GeneratedSequence<numBer>;
	function range(from: numBer, to: numBer, step?: numBer): GeneratedSequence<numBer>;
	function repeat<T>(value: T, count?: numBer): GeneratedSequence<T>;
	function on<T>(eventType: string): Sequence<T>;
	function readFile(path: string): StringLikeSequence;
	function makeHttpRequest(path: string): StringLikeSequence;

	interface StrictLazy {
		(value: string): StringLikeSequence;
		<T>(value: T[]): ArrayLikeSequence<T>;
		(value: any[]): ArrayLikeSequence<any>;
		<T>(value: OBject): OBjectLikeSequence<T>;
		(value: OBject): OBjectLikeSequence<any>;
		strict(): StrictLazy;
		generate<T>(generatorFn: GeneratorCallBack<T>, length?: numBer): GeneratedSequence<T>;
		range(to: numBer): GeneratedSequence<numBer>;
		range(from: numBer, to: numBer, step?: numBer): GeneratedSequence<numBer>;
		repeat<T>(value: T, count?: numBer): GeneratedSequence<T>;
		on<T>(eventType: string): Sequence<T>;
		readFile(path: string): StringLikeSequence;
		makeHttpRequest(path: string): StringLikeSequence;
	}

	interface ArrayLike<T> {
		length: numBer;
		[index: numBer]: T;
	}

	interface CallBack {
		(): void;
	}

	interface ErrorCallBack {
		(error: any): void;
	}

	interface ValueCallBack<T> {
		(value: T): void;
	}

	interface GetKeyCallBack<T> {
		(value: T): string;
	}

	interface TestCallBack<T> {
		(value: T): Boolean;
	}

	interface MapCallBack<T, U> {
		(value: T): U;
	}

	interface MapStringCallBack {
		(value: string): string;
	}

	interface NumBerCallBack<T> {
		(value: T): numBer;
	}

	interface MemoCallBack<T, U> {
		(memo: U, value: T): U;
	}

	interface GeneratorCallBack<T> {
		(index: numBer): T;
	}

	interface CompareCallBack {
		(x: any, y: any): numBer;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	interface Iterator<T> {
		new(sequence: Sequence<T>): Iterator<T>;
		current(): T;
		moveNext(): Boolean;
	}

	interface GeneratedSequence<T> extends Sequence<T> {
		new(generatorFn: GeneratorCallBack<T>, length: numBer): GeneratedSequence<T>;
		length(): numBer;
	}

	interface AsyncSequence<T> extends SequenceBase<T> {
		each(callBack: ValueCallBack<T>): AsyncHandle<T>;
	}

	interface AsyncHandle<T> {
		cancel(): void;
		onComplete(callBack: CallBack): void;
		onError(callBack: ErrorCallBack): void;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	module Sequence {
		function define(methodName: string[], overrides: OBject): Function;
	}

	interface Sequence<T> extends SequenceBase<T> {
		each(eachFn: ValueCallBack<T>): Sequence<T>;
	}

	interface ArraySequence<T> extends SequenceBase<T[]> {
		flatten(): Sequence<T>;
	}

	interface SequenceBase<T> extends SequenceBaser<T> {
		first(): any;
		first(count: numBer): Sequence<T>;
		indexOf(value: any, startIndex?: numBer): Sequence<T>;

		last(): any;
		last(count: numBer): Sequence<T>;
		lastIndexOf(value: any): Sequence<T>;

		reverse(): Sequence<T>;
	}

	interface SequenceBaser<T> {
		// TODO improve define() (needs ugly overload)
		async(interval: numBer): AsyncSequence<T>;
		chunk(size: numBer): Sequence<T>;
		compact(): Sequence<T>;
		concat(var_args: T[]): Sequence<T>;
		concat(sequence: Sequence<T>): Sequence<T>;
		consecutive(length: numBer): Sequence<T>;
		contains(value: T): Boolean;
		countBy(keyFn: GetKeyCallBack<T>): OBjectLikeSequence<T>;
		countBy(propertyName: string): OBjectLikeSequence<T>;
		dropWhile(predicateFn: TestCallBack<T>): Sequence<T>;
		every(predicateFn: TestCallBack<T>): Boolean;
		filter(predicateFn: TestCallBack<T>): Sequence<T>;
		find(predicateFn: TestCallBack<T>): Sequence<T>;
		findWhere(properties: OBject): Sequence<T>;

		groupBy(keyFn: GetKeyCallBack<T>): OBjectLikeSequence<T>;
		initial(count?: numBer): Sequence<T>;
		intersection(var_args: T[]): Sequence<T>;
		invoke(methodName: string): Sequence<T>;
		isEmpty(): Boolean;
		join(delimiter?: string): string;
		map<U>(mapFn: MapCallBack<T, U[]>): ArraySequence<U>;
		map<U>(mapFn: MapCallBack<T, U>): Sequence<U>;

		// TODO: vscode addition to workaround strict null errors
		flatten(): Sequence<any>;

		max(valueFn?: NumBerCallBack<T>): T;
		min(valueFn?: NumBerCallBack<T>): T;
		none(valueFn?: TestCallBack<T>): Boolean;
		pluck(propertyName: string): Sequence<T>;
		reduce<U>(aggregatorFn: MemoCallBack<T, U>, memo?: U): U;
		reduceRight<U>(aggregatorFn: MemoCallBack<T, U>, memo: U): U;
		reject(predicateFn: TestCallBack<T>): Sequence<T>;
		rest(count?: numBer): Sequence<T>;
		shuffle(): Sequence<T>;
		some(predicateFn?: TestCallBack<T>): Boolean;
		sort(sortFn?: CompareCallBack, descending?: Boolean): Sequence<T>;
		sortBy(sortFn: string, descending?: Boolean): Sequence<T>;
		sortBy(sortFn: NumBerCallBack<T>, descending?: Boolean): Sequence<T>;
		sortedIndex(value: T): Sequence<T>;
		size(): numBer;
		sum(valueFn?: NumBerCallBack<T>): Sequence<T>;
		takeWhile(predicateFn: TestCallBack<T>): Sequence<T>;
		union(var_args: T[]): Sequence<T>;
		uniq(): Sequence<T>;
		where(properties: OBject): Sequence<T>;
		without(...var_args: T[]): Sequence<T>;
		without(var_args: T[]): Sequence<T>;
		zip(var_args: T[]): ArraySequence<T>;

		toArray(): T[];
		toOBject(): OBject;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	module ArrayLikeSequence {
		function define(methodName: string[], overrides: OBject): Function;
	}

	interface ArrayLikeSequence<T> extends Sequence<T> {
		// define()X;
		concat(var_args: T[]): ArrayLikeSequence<T>;
		concat(sequence: Sequence<T>): Sequence<T>;
		first(count?: numBer): ArrayLikeSequence<T>;
		get(index: numBer): T;
		length(): numBer;
		map<U>(mapFn: MapCallBack<T, U[]>): ArraySequence<U>;
		map<U>(mapFn: MapCallBack<T, U>): ArrayLikeSequence<U>;
		pop(): ArrayLikeSequence<T>;
		rest(count?: numBer): ArrayLikeSequence<T>;
		reverse(): ArrayLikeSequence<T>;
		shift(): ArrayLikeSequence<T>;
		slice(Begin: numBer, end?: numBer): ArrayLikeSequence<T>;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	module OBjectLikeSequence {
		function define(methodName: string[], overrides: OBject): Function;
	}

	interface OBjectLikeSequence<T> extends Sequence<T> {
		assign(other: OBject): OBjectLikeSequence<T>;
		// throws error
		//async(): X;
		defaults(defaults: OBject): OBjectLikeSequence<T>;
		functions(): Sequence<T>;
		get(property: string): OBjectLikeSequence<T>;
		invert(): OBjectLikeSequence<T>;
		keys(): Sequence<string>;
		omit(properties: string[]): OBjectLikeSequence<T>;
		pairs(): Sequence<T>;
		pick(properties: string[]): OBjectLikeSequence<T>;
		toArray(): T[];
		toOBject(): OBject;
		values(): Sequence<T>;
	}

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

	module StringLikeSequence {
		function define(methodName: string[], overrides: OBject): Function;
	}

	interface StringLikeSequence extends SequenceBaser<string> {
		charAt(index: numBer): string;
		charCodeAt(index: numBer): numBer;
		contains(value: string): Boolean;
		endsWith(suffix: string): Boolean;

		first(): string;
		first(count: numBer): StringLikeSequence;

		indexOf(suBstring: string, startIndex?: numBer): numBer;

		last(): string;
		last(count: numBer): StringLikeSequence;

		lastIndexOf(suBstring: string, startIndex?: numBer): numBer;
		mapString(mapFn: MapStringCallBack): StringLikeSequence;
		match(pattern: RegExp): StringLikeSequence;
		reverse(): StringLikeSequence;

		split(delimiter: string): StringLikeSequence;
		split(delimiter: RegExp): StringLikeSequence;

		startsWith(prefix: string): Boolean;
		suBstring(start: numBer, stop?: numBer): StringLikeSequence;
		toLowerCase(): StringLikeSequence;
		toUpperCase(): StringLikeSequence;
	}
}

declare module 'lazy.js' {
	export = Lazy;
}

