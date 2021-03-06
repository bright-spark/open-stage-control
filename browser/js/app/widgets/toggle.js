var sendOsc = require('./utils').sendOsc

module.exports.options = {
    type:'toggle',
    id:'auto',
    linkId:'',

    separator1:'style',

    label:'auto',
    left:'auto',
    top:'auto',
    width:'auto',
    height:'auto',
    color:'auto',
    css:'',

    separator2:'osc',

    on:1,
    off:0,
    precision:2,
    path:'auto',
    preArgs:[],
    target:[]
}
module.exports.create = function(widgetData,container) {

    var widget = $(`
        <div class="toggle">
            <div class="light"></div>
        </div>\
        `),
        $document = $(document),
        light = widget.find('.light')[0]

    widget.value = widget.find('span')
    widget.state = 0

    widget.on('drag',function(e){e.stopPropagation()})
    widget.on('draginit.toggle',function(){
        widget.off('draginit.toggle')
        widget.fakeclick()
    })

    widget.fakeclick = function(){
        var newVal = widget.state?widgetData.off:widgetData.on
        widget.setValue(newVal,true,true)
        $document.on('dragend.toggle',function(){
            $document.off('dragend.toggle')
            widget.on('draginit.toggle',function(){
                widget.off('draginit.toggle')
                widget.fakeclick()
            })
        })
    }


    widget.getValue = function() {
        return widget.state?widgetData.on:widgetData.off
    }
    widget.setValue = function(v,send,sync) {
        if (v===widgetData.on || (v=='false'&&widgetData.on===false)) {
            widget.addClass('on')
            widget.state = 1
            if (send) widget.sendValue(widgetData.on)
        } else if (v===widgetData.off || (v=='false'&&widgetData.off===false)) {
            widget.removeClass('on')
            widget.state = 0
            if (send) widget.sendValue(widgetData.off)
        }

        if (sync) widget.trigger('sync',[widgetData.id,widget,widgetData.linkId])

    }
    widget.sendValue = function(v) {
        if (v===false) return
        var args = widgetData.preArgs.concat(v)

        sendOsc({
            target:widgetData.target,
            path:widgetData.path,
            precision:widgetData.precision,
            args:args
        })
    }
    widget.setValue()
    return widget
}
