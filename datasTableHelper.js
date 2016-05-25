/*
 *   leon created on 2016/5/17
 * */

(function ($) {
  var L10NConfig = {
    search: '快速过滤:',
    lengthMenu: "显示 _MENU_ 项",
    info: "目前显示的是 _TOTAL_ 个项目中的第 _START_ 到 _END_ 项",
    infoEmpty: "不存在符合条件的项",
    infoFiltered: "(过滤前总共有 _MAX_ 项)",
    emptyTable: "没有相关数据",
    zeroRecords: "不存在符合条件的项",
    paginate: {
      "first": "首页",
      "last": "尾页",
      "next": ">",
      "previous": "<"
    }
  };

  var generateColumnFilterInput = function (table, dataTables, enableCheckbox) {
    var inputs = '<thead class="datastable-filters"><tr>'
    var columns = dataTables.api().columns();
    var columnsItems = [];

    columns.every(function (i) {
      columnsItems.push(this);
      if (i == 0 && enableCheckbox) {
        inputs += '<th></th>';
      } else {
        inputs += '<th><input style="width: 80%" data-index="' + i + '"></th>';
      }
    });
    inputs += '</tr></thead>';
    
    table.find('thead').after(inputs);

    table.on('change keyup', '.datastable-filters input', function () {
      var index = $(this).data('index');
      var column = columnsItems[index];
      if(column.search() !== this.value){
        column.search(this.value).draw();
      }
    })
  };

  var generateItems = function (table, dataTables, enableCheckbox) {
    generateColumnFilterInput(table, dataTables, enableCheckbox);
  };

  var initTabSelect = function (columns) {
    // colums头部插入input这一列
    columns.unshift({
      title: '<input name="select_all" type="checkbox">',
      searchable: false,
      orderable: false,
      className: 'text-center no-table-trigger',
      render: function (data, type, full, meta) {
        return '<input type="checkbox">';
      }
    });
  };

  var bindSelectEvents = function (table, datasTable, selectedRows) {
    // Updates "Select all" control in a data table
    var updateDataTableSelectAllCtrl = function () {
      var $table = datasTable.table().node();
      var $chkbox_all = $('tbody input[type="checkbox"]', $table);
      var $chkbox_checked = $('tbody input[type="checkbox"]:checked', $table);
      var chkbox_select_all = $('thead input[name="select_all"]', $table).get(0);

      // If none of the checkboxes are checked
      if ($chkbox_checked.length === 0) {
        chkbox_select_all.checked = false;
        if ('indeterminate' in chkbox_select_all) {
          chkbox_select_all.indeterminate = false;
        }

        // If all of the checkboxes are checked
      } else if ($chkbox_checked.length === $chkbox_all.length) {
        chkbox_select_all.checked = true;
        if ('indeterminate' in chkbox_select_all) {
          chkbox_select_all.indeterminate = false;
        }

        // If some of the checkboxes are checked
      } else {
        chkbox_select_all.checked = true;
        if ('indeterminate' in chkbox_select_all) {
          chkbox_select_all.indeterminate = true;
        }
      }
    };

    // Handle click on checkbox
    table.on('click', 'tbody input[type="checkbox"]', function (e) {
      var $row = $(this).closest('tr');

      // Get row data
      var data = datasTable.row($row).data();

      // Determine whether row ID is in the list of selected row IDs
      var index = $.inArray(data, selectedRows);

      // If checkbox is checked and row ID is not in list of selected row IDs
      if (this.checked && index === -1) {
        selectedRows.push(data);

        // Otherwise, if checkbox is not checked and row ID is in list of selected row IDs
      } else if (!this.checked && index !== -1) {
        selectedRows.splice(index, 1);
      }

      // Update state of "Select all" control
      updateDataTableSelectAllCtrl();

      // Prevent click event from propagating to parent
      e.stopPropagation();
    });

    // Handle click on "Select all" control
    table.on('click', 'thead input[name="select_all"]', function (e) {
      if (this.checked) {
        table.find('tbody input[type="checkbox"]:not(:checked)').trigger('click');
      } else {
        table.find('tbody input[type="checkbox"]:checked').trigger('click');
      }

      // Prevent click event from propagating to parent
      e.stopPropagation();
    });

    // Handle click on table cells with checkboxes
    table.on('click', 'tbody tr td:first-child, thead tr th:first-child', function (e) {
      $(this).find('input[type="checkbox"]').trigger('click');
      e.stopPropagation();
    });

    // Handle table draw event
    datasTable.on('draw', function () {
      // Update state of "Select all" control
      updateDataTableSelectAllCtrl();
    });

    datasTable.on('search', function () {
      // 过滤的时候清除所有选中的checkbox, 并清空selectedRows
      selectedRows.length = 0;
      datasTable.$('input[type="checkbox"]:checked').removeAttr('checked');
      updateDataTableSelectAllCtrl();
    });
  };

  var bindCommonEvent = function (table, datasTable, selectedRows) {
    datasTable.on('draw', function () {
      $(window).trigger('resize');
    });
  };

  var bindRowClickEvent = function (table, datasTable, onRowClick) {
    var mouseDownPosition = {x: 0, y: 0};
    var mouseUpDPosition = {x: 0, y: 0};

    // 监听mousedown 记录鼠标位置
    table.on('mousedown', 'tbody tr td', function (event) {
      mouseDownPosition.x = event.pageX;
      mouseDownPosition.y = event.pageY;
    });

    table.on('click', 'td:not(.no-table-trigger)', function (e) {
      mouseUpDPosition.x = e.pageX;
      mouseUpDPosition.y = e.pageY;

      if (Math.abs(mouseDownPosition.x - mouseUpDPosition.x) > 10 ||
        Math.abs(mouseDownPosition.y - mouseUpDPosition.y) > 10) {
        e.stopPropagation();
        return;
      }

      var $row = $(this).closest('tr');
      var data = datasTable.row($row).data();

      onRowClick(data);
      e.stopPropagation();
    });
  };


  var methods = {
    // elementID: id of the table
    // data_source: source of table data
    init: function (data_source, columns, rowOptions, otherOptions) {
      var $this = $(this);

      // 是否有select选项
      var enableCheckbox = $this.hasClass('js-checkbox');

      var initCompleteCallback = function () {
        generateItems($this, this, enableCheckbox);
      };

      var options = {
        language: L10NConfig,
        order: [],
        bAutoWidth: false,
        data: data_source,
        columns: columns,
        dom: 'tilp',
        initComplete: initCompleteCallback
      };

      var bindRowClickEventWrapper = function () {
        if (otherOptions && otherOptions.onRowClick) {
          bindRowClickEvent($this, datasTable, otherOptions.onRowClick);
        }
      };

      var commonEventHandle = function () {
        bindRowClickEventWrapper();
        bindCommonEvent($this, datasTable, selectedRows);
      };

      var datasTable;
      if (enableCheckbox) {
        var selectedRows = [];
        initTabSelect(columns);
        datasTable = this.DataTable($.extend({}, options, rowOptions));
        bindSelectEvents($this, datasTable, selectedRows);
        commonEventHandle();

        return {
          datasTable: datasTable,
          selectedRows: selectedRows
        };
      } else {
        datasTable = this.DataTable($.extend({}, options, rowOptions));
        commonEventHandle();

        return {
          datasTable: datasTable
        }
      }
    },

    // elementID: id of the table
    // data_source: source of table data
    // columnsInfos: [{title, data, render},...]
    //              title: the title of the column,
    //              data: property of data_source to show,
    //              render[optional]: customize the data
    initWithColumnInfos: function (data_source, columnsInfos, exOptions) {
      var columns = [];

      $.each(columnsInfos, function (index, e) {
        var column = {
          data: e.data
        };

        if (e.title) {
          column.title = e.title;
        }

        if (e.render) {
          column.render = e.render;
        }

        columns.push(column);
      });

      return methods.init.call(this, data_source, columns, exOptions);
    }
  };

  $.fn.dataTableHelper = function (method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.tooltip');
    }
  };
})(jQuery);
