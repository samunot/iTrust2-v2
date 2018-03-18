var fs = require("fs"),
    slash = require('slash'),
    LineReaderSync = require("line-reader-sync"),
    linebyline = require('line-by-line'),
    path = slash(__dirname);


const execSync = require('child_process').execSync;
var itrust = slash("/iTrust2/src/main/java/edu/ncsu/csc/itrust2");

function fuzzRandomFiles() {
    execSync(`find ${path}/${itrust} -type f -name '*.java' > ${path}/source_java_files.txt`);
    lineReader = new LineReaderSync("source_java_files.txt");
    var listOfFiles = lineReader.toLines();
    // console.log("Number of source files edited: " + listOfFiles.length);
    if (listOfFiles.length == 0) {
        return;
    }
    var iteration = 0
    while (iteration < 3) {
        var i = 0
        while (i < listOfFiles.length) {
            var chance = Math.random() >= 0.60;
            if (chance) {
                console.log(listOfFiles[i]);
                if (listOfFiles[i].toLowerCase().includes("util") || listOfFiles[i].toLowerCase().includes("models")) {
                    i++;
                    continue;
                }
                editFile(listOfFiles[i]);
            }
            i++;
        }
        execSync(`git add . && git commit -m 'Commit fuzzing'`)
        var status = execSync(`cd iTrust2 && sudo mvn compile && echo 'helloworld' && echo $?`)
        status = status.toString().slice(-4);
        console.log(status)
        if (status.includes('0')) {
            execSync(`java -jar /tmp/jenkins-cli.jar -s http://localhost:8080/ build 'iTrustTestCoverage' -s`)
            console.log('waiting...');
        }
        execSync('git reset --hard HEAD^')
        console.log('done')
    }
}


function editFile(file) {
    var content = "";
    var file = file.replace(/\n|\r/g, "");
    lineReader = new linebyline(file, {
        encoding: 'utf8',
        skipEmptyLines: false
    });

    lineReader.on('error', function(err) {
        console.log(err + "\nError in file: " + file);
    });

    lineReader.on('line', function(line) {
        var temp = line;
        var chance = Math.random() >= 0.80;
        if (chance) {
            if (temp.includes("username") || temp.includes("password")) {
                // continue;
            } else {
                if (temp.includes("==")) {
                    temp = temp.replace(/==/g, '!=');
                } else if (temp.includes("!=")) {
                    temp = temp.replace(/!=/g, '==');
                }
                // else if (temp.includes("<")) {
                //     if (!temp.includes(">")) {
                //         temp = temp.replace(/</g, '>');
                //     }
                // } else if (temp.includes(">")) {
                //     if (!temp.includes("<") && !temp.includes("-")) {
                //         temp = temp.replace(/>/g, '<');
                //     }
                // }
            }

        }

        line = temp;
        content += line + "\n";
    });

    lineReader.on('end', function() {
        fs.writeFileSync(file, content);
    });
}

fuzzRandomFiles();