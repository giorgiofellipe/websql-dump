(() => {
  var jq = document.createElement('script');
  
  jq.onload = fucntion () {
    // DEFINE DATABASE BEING ACCESSED
    BD_NAME = 'dbname';

    // CHANGE SQL OUTPUT ORDER ACCORDING TO TABLES INTEGRITY RULE !!
    sortOrder = [
      'first_table', 
      'second_table', 
      'third_table',
      // ...
    ];

    const win = window;
    let db = win.openDatabase(BD_NAME, '1.0', 'database', 500 * 1024 * 1024);

    const backup = () => {
      var def = new $.Deferred();
      db.readTransaction((tx) => {
        tx.executeSql(`SELECT tbl_name, sql from sqlite_master WHERE type = "table" AND name NOT LIKE '%__WebKitDatabaseInfoTable__%';`, [], (tx, tableInfo) => {
          let promises = [];
          for (let key in tableInfo.rows) {
            if (key !== 'length' && key !== 'item') {
              const row = tableInfo.rows[key];

              promises.push(new Promise((resolve, reject) => {
                tx.executeSql(`SELECT * FROM ${row['tbl_name']};`, [], (tx, tableData) => {
                  resolve({
                    tableName: row['tbl_name'],
                    tableCreationSQL: row['sql'],
                    data: getPopulatedData(tableData)
                  });
                });
              }));
            }
          }
          Promise.all(promises)
            .then((fullData) => {
              def.resolve(fullData);
            })
        });
      }, (t, e) => {
        console.log('DBERROR: ', t, e);
      });
      return def;
    }

    const getPopulatedData = (resultset) => {
      var results = [];
      for (var i = 0, len = resultset.rows.length; i < len; i++) {
        var row = resultset.rows.item(i);
        var result = {};
        for (var key in row) {
          if (typeof row[key] === 'string') {
            if (row[key].length === 0) {
              result[key] = `null`;
            } else {
              result[key] = `'${row[key]}'`;
            }
          } else {
            result[key] = row[key];
          }
        }
        results.push(result);
      }
      return results;
    }

    console.log("Begin backup process");
    $.when(backup())
      .then((fullData) => {
        console.log("All done");
        console.log(fullData);

        sortResult = []
        sortOrder.forEach(function (key) {
          var found = false;
          fullData = fullData.filter(function (data) {
            if (!found && data['tableName'] == key) {
              sortResult.push(data);
              found = true;
              return false;
            } else
              return true;
          })
        });
        
        fullData = sortResult;

        let allTableCreators = '';
        let allInserts = '';
        for (const idx in fullData) {
          const table = fullData[idx];

          const tableRows = table.data;
          allTableCreators += `${table.tableCreationSQL};`;
          // console.log(`${table.tableName} tableCreationSQL: `, table.tableCreationSQL);

          for (let rowKey in tableRows) {
            const rowData = tableRows[rowKey];

            let insertQuery = `INSERT INTO ${table.tableName} ( `;

            let columnNameCounter = 0;
            for (let columnName in rowData) {
              columnNameCounter++;

              if (columnNameCounter === 1) {
                insertQuery += columnName;
              } else {
                insertQuery += `, ${columnName}`;
              }
            }

            insertQuery += ` ) VALUES ( `;

            let columnValueCounter = 0;
            for (let columnName in rowData) {
              const columnValue = rowData[columnName];

              columnValueCounter++;

              if (columnValueCounter === 1) {
                insertQuery += columnValue;
              } else {
                insertQuery += `, ${columnValue}`;
              }
            }

            insertQuery += ` ); `;
            allInserts += insertQuery;
            // console.log('insertQuery: ', insertQuery);
          }
        };
        allTableCreators = allTableCreators.replace(/(datetime)/gi, 'BIGINT');
        console.log(allTableCreators + allInserts);
      });
  }
  
  jq.src = "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js";
  document.getElementsByTagName('head')[0].appendChild(jq);
})();
