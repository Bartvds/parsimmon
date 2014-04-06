suite('parser', function() {
  "use strict";
  var string = Parsimmon.string;
  var regex = Parsimmon.regex;
  var letter = Parsimmon.letter;
  var digit = Parsimmon.digit;
  var any = Parsimmon.any;
  var optWhitespace = Parsimmon.optWhitespace;
  var eof = Parsimmon.eof;
  var succeed = Parsimmon.succeed;
  var all = Parsimmon.all;
  var index = Parsimmon.index;
  var seq = Parsimmon.seq;

  function asserThrows(call, fields, msg) {
    var pass = false;
    try {
      call();
      pass = true;
    }
    catch (error) {
      assert.instanceOf(error, Error);
      assert.equal(error.name, 'ParseError', error.toString());
      var values = Object.create(null);
      Object.keys(fields).forEach(function(key) {
        values[key] = error[key];
      });
      assert.deepEqual(values, fields);
    }
    assert(!pass, 'expected to fail ' + (msg ? ': ' + msg : ''));
  }

  suite('Parse Error', function() {
    test('first character', function() {
      var parser = string('x');
      var stream = 'abc';
      asserThrows(function() { parser.parse(stream) }, {
        message: "expected 'x' at character 0, got 'abc'\n    parsing: '" + stream + "'",
        index: 0,
        expected: 'x',
        position: { row: 0, col: 0}
      });
    });

    test('single line', function() {
      var parser = string('aabbcc');
      var stream = 'aabbccdd';
      asserThrows(function() { parser.parse(stream) }, {
        message: "expected EOF at character 6, got '...dd'\n    parsing: '" + stream + "'",
        index: 6,
        expected: 'EOF',
        position: { row: 0, col: 6}
      });
    });

    test('multiline', function() {
      var stream = 'aa\nbb\naaX\n';
      var parser = seq(
        string('aa\nbb\n'),
        string('aa').then(string('bb'))
      );
      asserThrows(function() { parser.parse(stream) }, {
        message: "expected 'bb' at character 8, got '...X\n'\n    parsing: '" + stream + "'",
        index: 8,
        expected: 'bb',
        position: { row: 2, col: 2}
      });
    });

    test('multiline mixed', function() {
      var stream = 'aa\n\nbb\n\naaX\n';
      var parser = seq(
        string('aa\n\nbb\n\n'),
        string('aa').then(string('bb'))
      );
      asserThrows(function() { parser.parse(stream) }, {
        index: 10,
        expected: 'bb',
        position: { row: 4, col: 2}
      });
    });

    test('multiline end', function() {
      var stream = 'aa\n\nbb\n\naa';
      var parser = seq(
        string('aa\n\nbb\n\n'),
        string('aa').then(string('bb'))
      );
      asserThrows(function() { parser.parse(stream) }, {
        index: 10,
        expected: 'bb',
        position: { row: 4, col: 2}
      });
    });
  });

  test('Parsimmon.string', function() {
    var parser = string('x');
    assert.equal(parser.parse('x'), 'x');
    assert.throws(function() { parser.parse('y') },
      "expected 'x' at character 0, got 'y'\n    parsing: 'y'");
  });

  test('Parsimmon.regex', function() {
    var parser = regex(/[0-9]/);

    assert.equal(parser.parse('1'), '1');
    assert.equal(parser.parse('4'), '4');
    assert.throws(function() { parser.parse('x'); },
      "expected /[0-9]/ at character 0, got 'x'\n    parsing: 'x'");
    assert.throws(function() { parser.parse('x0'); },
      "expected /[0-9]/ at character 0, got 'x0'\n    parsing: 'x0'");
  });

  test('Parsimmon.regex group', function() {
    var parser = regex(/v([0-9])/, 1);

    assert.equal(parser.parse('v1'), '1');
    assert.equal(parser.parse('v4'), '4');
    assert.throws(function() { parser.parse('x'); },
      "expected /v([0-9])/ at character 0, got 'x'\n    parsing: 'x'");
    assert.throws(function() { parser.parse('x0'); },
      "expected /v([0-9])/ at character 0, got 'x0'\n    parsing: 'x0'");
  });

  test('Parsimmon.regex invalid group', function() {
    var parser = regex(/v([0-9])/, 2);
    assert.throws(function() { parser.parse('v1'); },
      "expected /v([0-9])/ at character 0, got 'v1'\n    parsing: 'v1'");
  });

  suite('then', function() {
    test('with a parser, uses the last return value', function() {
      var parser = string('x').then(string('y'));
      assert.equal(parser.parse('xy'), 'y');
      assert.throws(function() { parser.parse('y'); },
        "expected 'x' at character 0, got 'y'\n    parsing: 'y'");
      assert.throws(function() { parser.parse('xz'); },
        "expected 'y' at character 1, got '...z'\n    parsing: 'xz'");
    });

    test('asserts that a parser is returned', function() {
      var parser1 = letter.then(function() { return 'not a parser' });
      assert.throws(function() { parser1.parse('x'); });

      var parser2 = letter.then('x');
      assert.throws(function() { letter.parse('xx'); });
    });

    test('with a function that returns a parser, continues with that parser', function() {
      var piped;
      var parser = string('x').then(function(x) {
        piped = x;
        return string('y');
      });

      assert.equal(parser.parse('xy'), 'y');
      assert.equal(piped, 'x');
      assert.throws(function() { parser.parse('x'); });
    });
  });

  suite('map', function() {
    test('with a function, pipes the value in and uses that return value', function() {
      var piped;

      var parser = string('x').map(function(x) {
        piped = x;
        return 'y';
      });

      assert.equal(parser.parse('x'), 'y')
      assert.equal(piped, 'x');
    });
  });

  suite('result', function() {
    test('returns a constant result', function() {
      var myResult = 1;
      var oneParser = string('x').result(1);

      assert.equal(oneParser.parse('x'), 1);

      var myFn = function() {};
      var fnParser = string('x').result(myFn);

      assert.equal(fnParser.parse('x'), myFn);
    });
  });

  suite('skip', function() {
    test('uses the previous return value', function() {
      var parser = string('x').skip(string('y'));

      assert.equal(parser.parse('xy'), 'x');
      assert.throws(function() { parser.parse('x'); });
    });
  });

  suite('or', function() {
    test('two parsers', function() {
      var parser = string('x').or(string('y'));

      assert.equal(parser.parse('x'), 'x');
      assert.equal(parser.parse('y'), 'y');
      assert.throws(function() { parser.parse('z') });
    });

    test('with then', function() {
      var parser = string('\\')
        .then(function() {
          return string('y')
        }).or(string('z'));

      assert.equal(parser.parse('\\y'), 'y');
      assert.equal(parser.parse('z'), 'z');
      assert.throws(function() { parser.parse('\\z') });
    });
  });

  function assertEqualArray(arr1, arr2) {
    assert.equal(arr1.join(), arr2.join());
  }

  suite('many', function() {
    test('simple case', function() {
      var letters = letter.many();

      assertEqualArray(letters.parse('x'), ['x']);
      assertEqualArray(letters.parse('xyz'), ['x','y','z']);
      assertEqualArray(letters.parse(''), []);
      assert.throws(function() { letters.parse('1'); });
      assert.throws(function() { letters.parse('xyz1'); });
    });

    test('followed by then', function() {
      var parser = string('x').many().then(string('y'));

      assert.equal(parser.parse('y'), 'y');
      assert.equal(parser.parse('xy'), 'y');
      assert.equal(parser.parse('xxxxxy'), 'y');
    });
  });

  suite('times', function() {
    test('zero case', function() {
      var zeroLetters = letter.times(0);

      assertEqualArray(zeroLetters.parse(''), []);
      assert.throws(function() { zeroLetters.parse('x'); });
    });

    test('nonzero case', function() {
      var threeLetters = letter.times(3);

      assertEqualArray(threeLetters.parse('xyz'), ['x', 'y', 'z']);
      assert.throws(function() { threeLetters.parse('xy'); });
      assert.throws(function() { threeLetters.parse('xyzw'); });

      var thenDigit = threeLetters.then(digit);
      assert.equal(thenDigit.parse('xyz1'), '1');
      assert.throws(function() { thenDigit.parse('xy1'); });
      assert.throws(function() { thenDigit.parse('xyz'); });
      assert.throws(function() { thenDigit.parse('xyzw'); });
    });

    test('with a min and max', function() {
      var someLetters = letter.times(2, 4);

      assertEqualArray(someLetters.parse('xy'), ['x', 'y']);
      assertEqualArray(someLetters.parse('xyz'), ['x', 'y', 'z']);
      assertEqualArray(someLetters.parse('xyzw'), ['x', 'y', 'z', 'w']);
      assert.throws(function() { someLetters.parse('xyzwv'); });
      assert.throws(function() { someLetters.parse('x'); });

      var thenDigit = someLetters.then(digit);
      assert.equal(thenDigit.parse('xy1'), '1');
      assert.equal(thenDigit.parse('xyz1'), '1');
      assert.equal(thenDigit.parse('xyzw1'), '1');
      assert.throws(function() { thenDigit.parse('xy'); });
      assert.throws(function() { thenDigit.parse('xyzw'); });
      assert.throws(function() { thenDigit.parse('xyzwv1'); });
      assert.throws(function() { thenDigit.parse('x1'); });
    });

    test('atMost', function() {
      var atMostTwo = letter.atMost(2);
      assertEqualArray(atMostTwo.parse(''), []);
      assertEqualArray(atMostTwo.parse('a'), ['a']);
      assertEqualArray(atMostTwo.parse('ab'), ['a', 'b']);
      assert.throws(function() { atMostTwo.parse('abc'); });
    });

    test('atLeast', function() {
      var atLeastTwo = letter.atLeast(2);

      assertEqualArray(atLeastTwo.parse('xy'), ['x', 'y']);
      assertEqualArray(atLeastTwo.parse('xyzw'), ['x', 'y', 'z', 'w']);
      assert.throws(function() { atLeastTwo.parse('x'); });
    });
  });

  suite('fail', function() {
    var fail = Parsimmon.fail;
    var succeed = Parsimmon.succeed;

    test('use Parsimmon.fail to fail dynamically', function() {
      var parser = any.then(function(ch) {
        return fail('a character besides ' + ch);
      }).or(string('x'));

      assert.throws(function() { parser.parse('y'); },
        "expected a character besides y, got the end of the string\n    parsing: 'y'");
      assert.equal(parser.parse('x'), 'x');
    });

    test('use Parsimmon.succeed or Parsimmon.fail to branch conditionally', function() {
      var allowedOperator;

      var parser =
        string('x')
        .then(string('+').or(string('*')))
        .then(function(operator) {
          if (operator === allowedOperator) return succeed(operator);
          else return fail(allowedOperator);
        })
        .skip(string('y'))
      ;

      allowedOperator = '+';
      assert.equal(parser.parse('x+y'), '+');
      assert.throws(function() { parser.parse('x*y'); },
        "expected + at character 2, got '...y'\n    parsing: 'x*y'");

      allowedOperator = '*';
      assert.equal(parser.parse('x*y'), '*');
      assert.throws(function() { parser.parse('x+y'); },
        "expected * at character 2, got '...y'\n    parsing: 'x+y'");
    });
  });

  test('eof', function() {
    var parser = optWhitespace.skip(eof).or(all.result('default'));

    assert.equal(parser.parse('  '), '  ')
    assert.equal(parser.parse('x'), 'default');
  });

  test('index', function() {
    var parser = regex(/^x*/).then(index);
    assert.equal(parser.parse(''), 0);
    assert.equal(parser.parse('xx'), 2);
    assert.equal(parser.parse('xxxx'), 4);
  });

  test('mark', function() {
    var ys = regex(/^y*/).mark()
    var parser = optWhitespace.then(ys).skip(optWhitespace);
    assert.deepEqual(parser.parse(''), { start: 0, value: '', end: 0 });
    assert.deepEqual(parser.parse(' yy '), { start: 1, value: 'yy', end: 3 });
  });

  suite('smart error messages', function() {
    // this is mainly about .or(), .many(), and .times(), but not about
    // their core functionality, so it's in its own test suite

    suite('or', function() {
      test('prefer longest branch', function() {
        var parser = string('abc').then(string('def')).or(string('ab').then(string('cd')));

        assert.throws(function() { parser.parse('abc'); },
          "expected 'def', got the end of the string\n    parsing: 'abc'");
      });

      test('prefer last of equal length branches', function() {
        var parser = string('abc').then(string('def')).or(string('abc').then(string('d')));

        assert.throws(function() { parser.parse('abc'); },
          "expected 'd', got the end of the string\n    parsing: 'abc'");
      });

      test('prefer longest branch even after a success', function() {
        var parser = string('abcdef').then(string('g')).or(string('ab'))
          .then(string('cd')).then(string('xyz'));

        assert.throws(function() { parser.parse('abcdef'); },
          "expected 'g', got the end of the string\n    parsing: 'abcdef'");
      });
    });

    suite('many', function() {
      test('prefer longest branch even in a .many()', function() {
        var atom = regex(/^[^()\s]+/);
        var sexpr = string('(').then(function() { return list; }).skip(string(')'));
        var list = optWhitespace.then(atom.or(sexpr)).skip(optWhitespace).many();

        // assert.deepEqual(list.parse('(a b) (c ((() d)))'), [['a', 'b'], ['c', [[[], 'd']]]]);

        assert.throws(function() { list.parse('(a b ()) c)'); },
          "expected EOF at character 10, got '...)'\n    parsing: '(a b ()) c)'");

        assert.throws(function() { list.parse('(a (b)) (() c'); },
          "expected ')', got the end of the string\n    parsing: '(a (b)) (() c'");
      });

      test('prefer longest branch in .or() nested in .many()', function() {
        var parser = string('abc').then(string('def')).or(string('a')).many();

        assert.deepEqual(parser.parse('aaabcdefaa'), ['a', 'a', 'def', 'a', 'a']);

        assert.throws(function() { parser.parse('aaabcde'); },
          "expected 'def' at character 5, got '...de'\n    parsing: 'aaabcde'");
      });
    });

    suite('times', function() {
      test('prefer longest branch in .times() too', function() {
        var parser = string('abc').then(string('def')).or(string('a')).times(3, 6);

        assert.throws(function() { parser.parse('aabcde'); },
          "expected 'def' at character 4, got '...de'\n    parsing: 'aabcde'");

        assert.throws(function() { parser.parse('aaaaabcde'); },
          "expected 'def' at character 7, got '...de'\n    parsing: 'aaaaabcde'");
      });
    });
  });
});
