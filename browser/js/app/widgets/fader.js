var utils = require('./utils'),
    clip = utils.clip,
    mapToScale = utils.mapToScale,
    sendOsc = utils.sendOsc

module.exports.options = {
    type:'fader',
    id:'auto',
    linkId:'',

    separator1:'style',

    label:'auto',
    unit:'',
    left:'auto',
    top:'auto',
    width:'auto',
    height:'auto',
    alignRight:false,
    horizontal:false,
    noPip:false,
    compact:false,
    color:'auto',
    css:'',

    separator2:'behaviour',

    snap:false,

    separator3:'osc',

    range:{min:0,max:1},
    logScale:false,
    precision:2,
    meter:false,
    path:'auto',
    preArgs:[],
    target:[]
}
module.exports.create = function(widgetData,container) {
    var widget = $(`
        <div class="fader-wrapper-outer">
            <div class="fader-wrapper">
                <div class="fader">
                    <div class="gauge"></div>
                    <div class="knob"></div>
                    <div class="pips"></div>
                </div>
            </div>
            <div class="input"></div>
        </div>
        `),
        gauge = widget.find('.gauge'),
        knob = widget.find('.knob'),
        wrapper = widget.find('.fader-wrapper'),
        fader = widget.find('.fader'),
        pips = widget.find('.pips'),
        input = widget.find('.input').fakeInput({align:'center'}),
        unit = widgetData.unit?' '+widgetData.unit.trim(): '',
        dimension = widgetData.horizontal?'width':'height',
        snap = widgetData.snap,
        logScale = widgetData.logScale,
        roundFactor = Math.pow(10,widgetData.precision)


    if (widgetData.horizontal) {
        container.addClass('horizontal')
    } else {
        if (widgetData.alignRight) container.addClass('align-right')
    }

    if (widgetData.compact) container.addClass('compact')
    if (widgetData.noPip) wrapper.addClass('no-pip')

    gauge.size = 0
    fader.size = 0
    wrapper.size = 0
    widget.value = undefined

    if (widgetData.meter) {
        var parsewidgets = require('../parser').widgets
        var data = {
            type:'meter',
            id: widgetData.id + '/meter',
            label:false,
            horizontal:widgetData.horizontal,
            range:widgetData.range,
            logScale:widgetData.logScale,
            path:widgetData.path + '/meter',
            preArgs:widgetData.preArgs,
            color:widgetData.color
        }
        var element = parsewidgets([data],fader)
		element[0].classList.add('not-editable')
        widget[0].classList.add('has-meter')
    }


    var rangeKeys = [],
        rangeVals = [],
        rangeLabels = []

    for (k in widgetData.range) {
        var key = k=='min'?0:k=='max'?100:parseInt(k),
            val = typeof widgetData.range[k] == 'object'?
                        widgetData.range[k][Object.keys(widgetData.range[k])[0]]:
                        widgetData.range[k],
            label = typeof widgetData.range[k] == 'object'?
                        Object.keys(widgetData.range[k])[0]:
                        val

        rangeKeys.push(key)
        rangeVals.push(val)
        rangeLabels.push(label)
    }

    var rangeValsMax = Math.max.apply(Math, rangeVals),
        rangeValsMin = Math.min.apply(Math, rangeVals)

    if (!widgetData.noPip&&!widgetData.compact) {
        var pipTexts = {}
        for (k in rangeKeys) {
            pipTexts[rangeKeys[k]]=rangeLabels[k]
        }

        var pipsInner = ''
        for (var i=0;i<=100;i++) {
            if (pipTexts[i]==undefined) continue

            var pos = dimension=='height'?'bottom':'left';

            var piptext = `<span>${Math.abs(pipTexts[i])>=1000?pipTexts[i]/1000+'k':pipTexts[i]}</span>`

            var add = `
                    <div class="pip val" style="${pos}:${i}%">${piptext}</div>
                `
            pipsInner = pipsInner + add
        }
        pips[0].innerHTML = pipsInner
    }





    fader.resize(function(){
        fader.size= dimension=='height'?fader.outerHeight():fader.outerWidth()
        wrapper.size = dimension=='height'?wrapper.outerHeight():wrapper.outerWidth()
        widget.updateUi(gauge.size)
    })

    wrapper.on('fake-right-click',function(e){
        if (!EDITING) {
            e.stopPropagation()
            e.preventDefault()
            input.focus()
        }
    })

    wrapper.on('mousewheel',function(e){
        if (e.originalEvent.wheelDeltaX) return

        e.preventDefault()
        e.stopPropagation()

        var divider = e.ctrlKey?4:.25
        gauge.size = clip(gauge.size+e.originalEvent.wheelDelta/(fader.size*divider),[0,100])

        widget.updateUi(gauge.size)

        var v = widget.getValue()

        if (v!=widget.value) {
            widget.value = v

            widget.sendValue(v)
            widget.showValue(v)

            widget.trigger('sync',[widgetData.id,widget,widgetData.linkId])
        }
    })

    var off = 0
    wrapper.on('draginit',function(e,data,traversing){
        if (snap || traversing) {

            var d = (dimension=='height')?
                    ((fader.size-data.offsetY+(wrapper.size-fader.size)/2) * 100 / fader.size):
                    (data.offsetX - (wrapper.size-fader.size)/2) * 100 / fader.size
            d = clip(d,[0,100])

            widget.updateUi(d)
            gauge.size = d

            var v = widget.getValue()

            if (v!=widget.value) {
                widget.value = v

                widget.sendValue(v)
                widget.showValue(v)

                widget.trigger('sync',[widgetData.id,widget,widgetData.linkId])
            }

        }

        off = gauge.size

    })


    wrapper.on('drag',function(e,data){

        var d = (dimension=='height')?-data.deltaY:data.deltaX
            d = clip(d*100/fader.size+off,[0,100])

        widget.updateUi(d)

        gauge.size = d

        var v = widget.getValue()

        if (v!=widget.value) {
            widget.value = v

            widget.sendValue(v)
            widget.showValue(v)

            widget.trigger('sync',[widgetData.id,widget,widgetData.linkId])
        }

    })

    widget.updateUi = function(v){
        var s = v/100,
            t = dimension=='height'?
                ['1,'+s+',1','0,'+ Math.round(-s*fader.size) +'px,0']
                :[s+',1,1',Math.round(s*fader.size) +'px,0,0']
        gauge[0].setAttribute('style','transform:scale3d('+t[0]+')')
        knob[0].setAttribute('style','transform:translate3d('+t[1]+')')
    }

    widget.getValue = function(){
        var h = clip(gauge.size,[0,100])
        for (var i=0;i<rangeKeys.length-1;i++) {
            if (h <= rangeKeys[i+1] && h >= rangeKeys[i]) {
                return mapToScale(h,[rangeKeys[i],rangeKeys[i+1]],[rangeVals[i],rangeVals[i+1]],widgetData.precision,logScale)
            }
        }

    }
    widget.setValue = function(v,send,sync) {
        if (typeof v != 'number') return

        var h,
            v = clip(Math.round(v*roundFactor)/roundFactor,[rangeValsMin,rangeValsMax])
        for (var i=0;i<rangeVals.length-1;i++) {
            if (v <= rangeVals[i+1] && v >= rangeVals[i]) {
                h = mapToScale(v,[rangeVals[i],rangeVals[i+1]],[rangeKeys[i],rangeKeys[i+1]],false,logScale,true)
                break
            }
        }

        widget.updateUi(h)

        gauge.size = h

        widget.value = v
        widget.showValue(v)


        if (sync) widget.trigger('sync',[widgetData.id,widget,widgetData.linkId])
        if (send) widget.sendValue(v)
    }

    widget.sendValue = function(v) {
        var args = widgetData.preArgs.concat(v)

        sendOsc({
            target:widgetData.target,
            path:widgetData.path,
            precision:widgetData.precision,
            args:args
        })
    }

    widget.showValue = function(v) {
        input.val(v+unit)
    }

    input.change(function(){
        widget.setValue(parseFloat(input.val()),true,true)
    })

    widget.setValue(rangeVals[0])

    return widget
}
