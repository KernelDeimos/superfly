const TEST_JS = false;


function CLASS(model) {
  if ( ! model.properties ) {
    model.properties = [];
  } else {
    model.properties = model.properties.map((p) => {
      var a = p.split(' ');
      if ( a.length == 1 ) { return { name: a[0], adapt: v => v } };
      return {
        name: a[1],
        adapt: {
          'String[]': v => {
            if ( typeof v == 'string' ) return [ v ];
            return v;
          },
          Expr: v => {
            if ( typeof v === 'number'   ) return LITERAL(v);
            if ( typeof v === 'string'   ) return LITERAL(v);
            if ( typeof v === 'function' ) return LITERAL(v);
            if ( typeof v === 'boolean'  ) return LITERAL(v);
            return v;
          },
        }[a[0]]
      };
    });
  }

  var proto_ = {
    toString() {
      var s = model.name + '(';

      for ( var i = 0 ; i < model.properties.length ; i++ ) {
        var val = this[model.properties[i].name];
        if ( val === undefined ) break;
        if ( i ) s += ', ';
        s = s + val.toString();
      }

      s = s + ')';

      return s;
    },
    partialEval() { return this; },
    toJS() { return '<JS NOT DEFINED for ' + model.NAME + '>'; },
    initArgs(...args) {
      for ( var i = 0 ; i < model.properties.length && i < args.length ; i++ ) {
        this[model.properties[i].name] = model.properties[i].adapt(args[i]);
      }
    }
  };

  var cls = function(...args) {
    var o = Object.create(proto_);
    o.initArgs(...args);
    return o;
  };

  cls.isInstance = function(o) { return o.__proto__ == proto_; }

  if ( model.methods ) {
    for ( var i = 0 ; i < model.methods.length ; i++ ) {
      var m = model.methods[i];

      var match = m.toString().
          match(/^function\s+([A-Za-z_$][0-9A-Za-z_$]*)\s*\(/);
      var name = match[1];

      proto_[name] = m;
    }
  }

  globalThis[model.name] = cls;
}


CLASS({
  name: 'LITERAL',
  properties: [ 'value' ],
  methods: [
    function eval(x) {
      return this.value;
    },
    function toJS(x) {
      return this.value.toString();
    }
  ]
});


CLASS({
  name: 'EQ',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) == this.arg2.eval(x);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} == ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'LT',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) < this.arg2.eval(x);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} < ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'GT',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) > this.arg2.eval(x);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} > ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'LTE',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) <= this.arg2.eval(x);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} <= ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'GTE',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) >= this.arg2.eval(x);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} >= ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'AND',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) && this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) ) {
        var v1 = arg1.eval(x);
        if ( ! v1 ) return LITERAL(false);
        return arg2;
      }

      if ( LITERAL.isInstance(arg2) ) {
        var v2 = arg2.eval(x);
        if ( ! v2 ) return LITERAL(false);
        return arg1;
      }

      return AND(arg1, arg2);
    },

    function toJS(x) {
      return `(${this.arg1.toJS(x)} && ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'OR',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) || this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) ) {
        var v1 = arg1.eval(x);
        if ( v1 ) return LITERAL(true);
        return arg2;
      }

      if ( LITERAL.isInstance(arg2) ) {
        var v2 = arg2.eval(x);
        if ( v2 ) return LITERAL(true);
        return arg1;
      }

      return OR(arg1, arg2);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} || ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'NOT',
  properties: [ 'Expr expr' ],
  methods: [
    function eval(x) {
      return ! this.expr.eval(x);
    },
    function toJS(x) {
      return `(! ${this.expr.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'PLUS',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) + this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) && LITERAL.isInstance(arg2) ) {
        return LITERAL(arg1.eval(x) + arg2.eval(x));
      }

      return PLUS(arg1, arg2);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} + ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'MUL',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) * this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) && LITERAL.isInstance(arg2) ) {
        return LITERAL(arg1.eval(x) * arg2.eval(x));
      }

      if ( LITERAL.isInstance(arg1) ) {
        var v1 = arg1.eval(x);
        if ( v1 == 0 ) return 0;
        if ( v1 == 1 ) return arg2;
      }

      if ( LITERAL.isInstance(arg2) ) {
        var v2 = arg2.eval(x);
        if ( v2 == 0 ) return 0;
        if ( v2 == 1 ) return arg1;
      }

      return MUL(arg1, arg2);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} * ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'DIV',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) / this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) && LITERAL.isInstance(arg2) ) {
        return LITERAL(arg1.eval(x) / arg2.eval(x));
      }

      if ( LITERAL.isInstance(arg2) ) {
        var v2 = arg2.eval(x);
        // if ( v2 == 0 ) error divide by zer
        if ( v2 == 1 ) return arg1;
      }

      return DIV(arg1, arg2);
    },
    function toJS(x) {
      return `(${this.arg1.toJS(x)} / ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'MINUS',
  properties: [ 'Expr arg1', 'Expr arg2' ],
  methods: [
    function eval(x) {
      return this.arg1.eval(x) - this.arg2.eval(x);
    },

    function partialEval(x) {
      var arg1 = this.arg1.partialEval(x);
      var arg2 = this.arg2.partialEval(x);

      if ( LITERAL.isInstance(arg1) && LITERAL.isInstance(arg2) ) {
        return LITERAL(arg1.eval(x) - arg2.eval(x));
      }

      return MINUS(arg1, arg2);
    },

    function toJS(x) {
      return `(${this.arg1.toJS(x)} - ${this.arg2.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'LET',
  properties: [ 'Expr key', 'Expr value' ],
  methods: [
    function eval(x) {
      x.set(this.key.eval(x), SLOT(this.value.partialEval(x).eval(x)));
    },
    function toJS(x) {
      return `var ${this.key.toJS(x)} = ${this.value.toJS(x)}`
    }
  ]
});

// TODO: 'SET'

CLASS({
  name: 'CONST',
  documentation: "The same as LET but can partialEval() the lookup becuase it doesn't change.",
  properties: [ 'Expr key', 'Expr value' ],
  methods: [
    function eval(x) {
      x.set(this.key.eval(x), CONSTANT_SLOT(this.value.partialEval(x).eval(x)));
    },
    function partialEval(x) {
      return LITERAL(this.value.eval(x));
    },
    function toJS(x) {
      return `const ${this.key.toJS(x)} = ${this.value.toJS(x)}`
    }
  ]
});


CLASS({
  name: 'VAR',
  properties: [ 'Expr key' ],
  methods: [
    function eval(x) {
      return x.get(this.key.eval(x)).eval();
      /*
      Experiment, but not faster.
      var slot = this.slot;
      if ( slot && x == this.lastX ) return slot.eval(x);
      slot = this.slot = x.get(this.key.eval(x));
      this.lastX = x;
      return slot.eval(x);
      */
      // TODO This breaks when doing recursion, because x may have
      // changed from the last time we were evaluated to a sub-frame.
      /*
      if ( ! this.slot ) this.slot = x.get(this.key.eval(x));
      return this.slot.eval(x);
      */
    },
    function partialEval(x) {
      var key = this.key.partialEval(x);
      var slot = x.get(key.eval(x));
      if ( slot && CONSTANT_SLOT.isInstance(slot) ) return slot.eval(x);
     // if ( LITERAL.isInstance(this.key) ) return LITERAL_VAR(this.key.eval(x));
      return this;
      /*
      if ( ! this.slot ) this.slot = x.get(this.key.eval(x));
      return this.slot.partialEval(x);
      */
    },
    function toJS(x) {
      return this.key.toJS(x);
    }
  ]
});


/*
CLASS({
  name: 'LITERAL_VAR',
  properties: [ 'key' ],
  methods: [
    function eval(x) {
      return x.get(this.key).eval(x);
    },
    function partialEval(x) {
      return this;
    },
    function toJS(x) {
      return this.key;
    }
  ]
});
*/

var LITERAL_VAR = VAR;

CLASS({
  name: 'APPLY',
  properties: [ 'Expr fn', 'Expr args' ],
  methods: [
    function eval(x) {
      return this.fn.eval(x)(this.args.eval(x));
    },
    function partialEval(x) {
      var fn   = this.fn.partialEval(x);
      var args = this.args.partialEval(x);
      if ( LITERAL.isInstance(fn) ) { console.log('---------------- Creating LITERAL_APPLY', fn.eval(x)); return LITERAL_APPLY(fn.eval(x), args); }
      return APPLY(fn, args);
    },
    function toJS(x) {
      return `(${this.fn.toJS(x)})(${this.args.toJS(x)})`;
    }
  ]
});

CLASS({
  name: 'LITERAL_APPLY',
  properties: [ 'fn', 'Expr args' ],
  methods: [
    function eval(x) {
      return this.fn(this.args.eval(x));
    },
    function partialEval(x) {
      return this;
    },
    function toJS(x) {
      return `(${this.fn})(${this.args.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'FN',
  properties: [ 'String[] args', 'Expr expr' ],
  methods: [
    function eval(x) {
      var self = this;
      return function() {
        var y = x.subFrame();
        for ( var i = 0 ; i < self.args.length ; i++ ) {
          y.set(self.args[i], SLOT(arguments[i]));
        }
        return self.expr.eval(y);
      }
    },
    function partialEval(x) {
      return FN(this.args, this.expr.partialEval(x));
    },
    function toJS(x) {
      return `function(${this.args.join(',')}) { return ${this.expr.toJS(x)} }`;
    }
  ]
});


CLASS({
  name: 'IF',
  properties: [ 'Expr expr', 'Expr ifBlock', 'Expr elseBlock' ],
  methods: [
    function eval(x) {
      var b = this.expr.eval(x);

      if ( b ) return this.ifBlock.eval(x);

      var elseBlock = this.elseBlock;

      return elseBlock && elseBlock.eval(x);
    },
    function partialEval(x) {
      var expr = this.expr.partialEval(x);

      if ( LITERAL.isInstance(expr) ) {
        if ( expr.eval(x) ) return this.ifBlock.partialEval(x);
        return this.elseBlock && this.elseBlock.partialEval(x);
      }

      return IF(
        expr,
        this.ifBlock.partialEval(x),
        this.elseBlock && this.elseBlock.partialEval(x));
    },
    function toJS(x) {
      // TODO: Are the if/else cases blocks or expressions?  This
      // assumes that they are expression.

      return `( ( ${this.expr.toJS(x)} ) ? ( ${this.ifBlock.toJS(x)} ) : ( ${this.elseBlock.toJS(x)} ) )`;
    }
  ]
});

CLASS({
  name: 'COND',
  // Lisp COND like series of conditions and bodies to execute.
  //
  properties: [
    'args'
  ],
  methods: [
    function initArgs(...args) {
      this.args = args;
    },
    function eval(x) {
      for ( var i = 0 ; i < this.args.length ; i += 2 ) {
        var c = this.args[i].eval(x);
        if ( c ) return this.args[i + 1].eval(x);
      }
    }
  ]
});


CLASS({
  name: 'PRINT',
  properties: [ 'Expr expr' ],
  methods: [
    function eval(x) {
      console.log(this.expr.eval(x));
    },
    function toJS(x) {
      return `console.log(${this.expr.toJS(x)})`;
    }
  ]
});


CLASS({
  name: 'SEQ',
  properties: [
    'args'
  ],
  methods: [
    function initArgs(...args) {
      this.args = args;
    },
    function eval(x) {
      return this.args.reduce((result, step) => step.eval(x), null);
    },
    function toJS(x) {
      // TODO: Whats the right way to return the final value?
      return this.args.map(a => a.toJS(x)).join(';\n');
    }
  ]
});

/*
CLASS({
  name: 'SLOT',
  documentation: 'A Stack-Frame entry.',

  properties: [ 'value' ],

  methods: [
    function eval() {
      return this.value;
    },
    function set(value) {
      this.value = value;
    }
  ]
});
*/

SLOT = function(value) {
  return {
    name: 'SLOT',
    eval: function() { return value; },
    set: function(val) { value = val; },
    partialEval: function() { return this; }
  };
}


CLASS({
  name: 'CONSTANT_SLOT',
  documentation: 'A Stack-Frame entry.',

  properties: [ 'value' ],

  methods: [
    function eval() {
      return this.value;
    },
    function partialEval() {
      return LITERAL(this.value);
    },
    function set(value) {
      // Can't update a constant
    }
  ]
});

CLASS({
  name: 'HEAD',
  properties: [
    'Expr pair',
  ],
  methods: [
    function eval(x) {
      return this.pair.eval(x)[0];
    }
  ]
});

CLASS({
  name: 'TAIL',
  properties: [
    'Expr pair'
  ],
  methods: [
    function eval(x) {
      return this.pair.eval(x)[1];
    }
  ]
});

CLASS({
  name: 'PAIR',
  properties: [
    'Expr head',
    'Expr tail'
  ],
  methods: [
    function eval(x) {
      return [this.head.eval(x), this.tail.eval(x)];
    }
  ]
});

CLASS({
  name: 'FRAME',
  documentation: 'A Stack-Frame / Context.',

  methods: [
    function subFrame() {
//      return Object.create(frame); // is ~8% faster
      return Object.create(this);
    },
    function get(name) {
      var slot = this[name];
      if ( ! slot ) {
        console.log("Unknown variable name ", name);
      } else {
        return slot;
      }
    },
    function set(name, slot) {
      this[name] = slot;
    }
  ]
});

var frame = FRAME();

function test(expr) {
  var partial = expr.partialEval(frame);
  var start = performance.now();
  var result = partial.eval(frame);
  var end   = performance.now();
  console.log('SF', expr.toString(), '->', partial.toString(), '->', result, ' Time: ' + (end-start).toFixed(3) + " ms");

  if ( ! TEST_JS ) return;

  // JS testing
  start = performance.now();
  try {
    result = eval(expr.toJS());
  } catch(e) {
    result = e;
  }
  end = performance.now();

  console.log('JS', expr.toString(), '->', expr.toJS(), '->', result, ' Time: ' + (end-start).toFixed(3) + ' ms');
}

function title(s) {
  console.log('\n');
  console.log('Testing ' + s);
  console.log('-------------------------');
}

title('Basics');
test(LITERAL(5));

test(EQ(5, 4));
test(EQ(5, 4));

test(NOT(EQ(5, 4)));

test(PLUS(5, 4));

PRINT(PLUS(5, 4)).eval();

test(PRINT(PLUS(5, 4)));

test(PRINT(EQ(
  PLUS(5, 4),
  MINUS(10, 1)
)));

console.log(EQ(
  PLUS(5, 4),
  MINUS(10, 1)
).toString());

console.log(EQ(
  PLUS(5, 4),
  MINUS(10, 1)
).toJS());

title('LT');
test(LT(5, 4));
test(LT(4, 5));

title('GT');
test(GT(5, 4));
test(GT(4, 5));

title('Variables');
test(LET('x', 42));
PRINT(VAR('x')).eval(frame);

test(SEQ(
  LET('x', 42),
  VAR('x')
));

title('Partial-Eval');
console.log('eval: ', PLUS(5, 4).eval());
console.log('partialEval: ', PLUS(5, 4).partialEval().toString());
console.log('partialEval + eval: ', PLUS(5, 4).partialEval().eval());

title('Apply');
test(APPLY(function(n) { return n*2; }, 2));

title('Minus');
test(MINUS(10, 1));

title('If');
test(IF(EQ(1, 1), 42, PLUS(2, 4)));
test(IF(EQ(1, 2), 42, PLUS(2, 4)));

title('And');
test(AND(false, false));
test(AND(false, true));
test(AND(true, false));
test(AND(true, true));

title('Or');
test(OR(false, false));
test(OR(false, true));
test(OR(true, false));
test(OR(true, true));

title('MUL');
test(MUL(5, 5));
test(MUL(1, 42));
test(MUL(0, 42));
test(MUL(42, 1));
test(MUL(42, 0));
test(MUL(2, 4));
test(SEQ(LET('X', 42), MUL(VAR('X'), 1)));
test(SEQ(LET('X', 42), MUL(VAR('X'), 0)));
test(SEQ(LET('X', 42), MUL(1, VAR('X'))));
test(SEQ(LET('X', 42), MUL(0, VAR('X'))));

title('DIV');
test(DIV(5, 5));
test(DIV(1, 42));
test(DIV(0, 42));
test(DIV(42, 1));
test(DIV(42, 0));
test(DIV(2, 4));
test(SEQ(LET('X', 42), DIV(VAR('x'), 1)));
test(SEQ(LET('X', 42), DIV(VAR('x'), 0)));
test(SEQ(LET('X', 42), DIV(1, VAR('x'))));
test(SEQ(LET('X', 42), DIV(0, VAR('x'))));

title('Functions');
var square = FN('I', MUL(VAR('I'), VAR('I')));
test(APPLY(square, 5));

test(SEQ(
  LET('SQUARE', FN('I', MUL(VAR('I'), VAR('I')))),
  APPLY(VAR('SQUARE'), 5)
));

test(SEQ(
  LET('SQUARE', FN('I', MUL(VAR('I'), VAR('I')))),
  APPLY(VAR('SQUARE'), 5)
));

var FACT = LET('FACT', FN('I',
  IF(EQ(VAR('I'), 1),
    1,
    MUL(
      VAR('I'),
          APPLY(VAR('FACT'), MINUS(VAR('I'), 1))))));

test(SEQ(FACT, APPLY(VAR('FACT'), 1)));
test(SEQ(FACT, APPLY(VAR('FACT'), 5)));
test(SEQ(FACT, APPLY(VAR('FACT'), 50)));

title('Fibonacci');
CONST('FIB', FN('I',
  IF(LT(LITERAL_VAR('I'), 2),
    1,
    PLUS(
      APPLY(LITERAL_VAR('FIB'), MINUS(LITERAL_VAR('I'), 1)),
      APPLY(LITERAL_VAR('FIB'), MINUS(LITERAL_VAR('I'), 2)))))).eval(frame);

/*/
test(APPLY(VAR('FIB'), 1));
test(APPLY(VAR('FIB'), 2));
test(APPLY(VAR('FIB'), 3));
test(APPLY(VAR('FIB'), 4));
test(APPLY(VAR('FIB'), 5));
test(APPLY(VAR('FIB'), 6));
test(APPLY(VAR('FIB'), 7));
test(APPLY(VAR('FIB'), 8));
test(APPLY(VAR('FIB'), 9));
test(APPLY(VAR('FIB'), 10));
test(APPLY(VAR('FIB'), 20));
test(APPLY(VAR('FIB'), 30));
/*///*/

/*
var f = APPLY(VAR('FIB'), 25).partialEval(frame);
console.log('__________________START');
console.profile();
for ( var i = 0 ; i < 100 ; i++ ) f.eval(frame);
console.profileEnd();
console.log('__________________END');
*/

title('CONST');
LET('PI', Math.PI).eval(frame);
test(MUL(2, VAR('PI')));

CONST('PI_CONST', Math.PI).eval(frame);
test(MUL(2, VAR('PI_CONST')));


title('StringPStream');

LET('StringPStream',
    FN('name',
       COND(
         EQ(VAR('name'), 'create'),
         FN('string', PAIR(VAR('string'), PAIR(0, LITERAL(null)))),
         EQ(VAR('name'), 'head'),
         FN('ps', APPLY(function(args) { return args[0][args[1]]; }, PAIR(HEAD(VAR('ps')), HEAD(TAIL(VAR('ps')))))),
         EQ(VAR('name'), 'setValue'),
         FN('ps', FN('value', PAIR(HEAD(VAR('ps')), PAIR(HEAD(TAIL(VAR('ps'))), TAIL(TAIL(VAR('ps')))))))))
   ).eval(frame);

test(SEQ(LET('ps', APPLY(APPLY(VAR('StringPStream'), 'create'), 'hello')),
             PRINT(APPLY(APPLY(VAR('StringPStream'), 'head'), VAR('ps')))));

console.log('done');
