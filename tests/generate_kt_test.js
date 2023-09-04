const fs = require('fs');

if (process.argv.length < 4) {
  console.log('Synopsis: node generate_kt_test.js path/to/some_policy.rego path/to/ KotlinClassName');
  console.log(process.argv);
  process.exit(1);
}

const policy_file_name = process.argv[process.argv.length - 3]
const tests_dir_name = process.argv[process.argv.length - 2]
const kotlin_class_name = process.argv[process.argv.length - 1]

// NOTE(dkorolev): This IIFE is just to keep the per-commit delta small.
let step1 = (() => {
  const tests = (() => {
    const tests_json_fn = tests_dir_name + '/tests.json';
    try {
      return fs.readFileSync(tests_json_fn, {encoding:'utf8'}).split('\n').filter(x => x !== '').map(JSON.parse);
    } catch(e) {
      console.error(`Error reading '${tests_json_fn}', something's wrong with the '.rego' files in the repo.`);
      process.exit(1);
    }
  })();
  const goldens_path = policy_file_name + '.goldens.json';
  const goldens = (() => {
    try {
      return fs.readFileSync(goldens_path, {encoding:'utf8'}).split('\n').filter(x => x !== '').map(JSON.parse);
    } catch(e) {
      console.error(`Error reading '${goldens_path}', did you run './scripts/gen_all_goldens.sh'?`);
      process.exit(1);
    }
  })();
  if (tests.length !== goldens.length) {
    console.error(`The number of tests and goldens don't match for '${fn}'.`);
    process.exit(1);
  }
  return { tests, goldens };
})();

console.log('import kotlinx.serialization.json.Json');
console.log('import org.junit.jupiter.api.Assertions.assertEquals');
console.log('import org.junit.jupiter.api.Test');
console.log('import org.junit.jupiter.api.DisplayName');
console.log('');

console.log(`fun run${kotlin_class_name}TestCase(goldenJson: String, inputJson: String) {`);
console.log('    assertEquals(');
console.log('        goldenJson,');
console.log('        opaValueToJson(');
console.log(`            ${kotlin_class_name}(`);
console.log('                jsonToOpaValue(Json.parseToJsonElement(inputJson)),');
console.log('                OpaValue.ValueUndefined,');
console.log('            ),');
console.log('        ).toString(),');
console.log('    )');
console.log('}');

// NOTE(dkorolev): This IIFE is just to keep the per-commit delta small.
(() => {
  const t = step1;
  console.log('');
  console.log('// NOTE: The tests below, at least originally, were autogenerated from `tests.json` and from OPA\'s golden outputs.');
  console.log(`class ${kotlin_class_name}Test {`);
  for (let i = 0; i < t.tests.length; ++i) {
    if (i > 0) {
      console.log('');
    }
    console.log('    @Test');
    console.log(`    @DisplayName("""${JSON.stringify(t.tests[i])}""")`);
    console.log(`    fun test${kotlin_class_name}${i+1}() {`);
    console.log(`        run${kotlin_class_name}TestCase("""{"result":${JSON.stringify(t.goldens[i])}}""", ` +
                                                        `"""${JSON.stringify(t.tests[i])}""")`);
    console.log(`    }`);
  }
  console.log(`}`);
})();
