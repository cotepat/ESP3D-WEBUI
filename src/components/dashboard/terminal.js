/*
 terminal.js - ESP3D WebUI terminal file

 Copyright (c) 2020 Luc Lebosse. All rights reserved.

 This code is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.

 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public
 License along with This code; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

import { h } from "preact"
import { T } from "../translations"
import { useState, useEffect } from "preact/hooks"
import { initApp } from "../uisettings"
import { globaldispatch, Page, Action } from "../app"
import { X, XCircle, Send } from "preact-feather"
import { SendCommand } from "../http"
import { useStoreon } from "storeon/preact"
const { isVerboseData } = require(`../${process.env.TARGET_ENV}`)

/*
 * Local variables
 *
 */
let monitorDataQuiet = []
let monitorDataVerbose = []
let currentOutput = []
let verboseOutput = true
let autoscrollOutput = true
let pauseAutoscroll = false
var commandHistory = []
var commandHistoryIndex = -1

/*
 * Local constants
 *
 */
const MAX_HISTORY_SIZE = 40
const MAX_LINES_MONITOR = 300

/*
 * Update Terminal window
 *
 */
function updateTerminal(data) {
    updateQuietTerminal(data)
    updateVerboseTerminal(data)
    updateContentType()
}

/*
 * Update quiet Terminal window
 *
 */
function updateQuietTerminal(data) {
    if (!isVerboseData(data)) {
        monitorDataQuiet.push(<div>{data}</div>)
        if (autoscrollOutput && pauseAutoscroll) {
            if (monitorDataQuiet.length > 2 * MAX_LINES_MONITOR)
                monitorDataQuiet = monitorDataQuiet.slice(-MAX_LINES_MONITOR)
        } else {
            monitorDataQuiet = monitorDataQuiet.slice(-MAX_LINES_MONITOR)
        }
    }
}

/*
 * Update Verbose Terminal window
 *
 */
function updateVerboseTerminal(data) {
    monitorDataVerbose.push(<div>{data}</div>)
    if (autoscrollOutput && pauseAutoscroll) {
        if (monitorDataVerbose.length > 2 * MAX_LINES_MONITOR)
            monitorDataVerbose = monitorDataVerbose.slice(-MAX_LINES_MONITOR)
    } else {
        monitorDataVerbose = monitorDataVerbose.slice(-MAX_LINES_MONITOR)
    }
}

/*
 * Update type of content of Terminal window
 *
 */
function updateContentType() {
    const { dispatch } = useStoreon()
    if (verboseOutput) currentOutput = monitorDataVerbose
    else currentOutput = monitorDataQuiet
    dispatch("monitor/set", currentOutput)
    /*globaldispatch({
        type: Action.renderAll,
    })*/
}

/*
 * Terminal Controls
 *
 */
const TerminalControls = () => {
    const [isVerbose, setVerbose] = useState(verboseOutput)
    const toogleVerbose = e => {
        verboseOutput = e.target.checked
        setVerbose(e.target.checked)
        updateContentType()
    }
    const [isAutoscroll, setAutoscroll] = useState(autoscrollOutput)
    const toogleAutoscroll = e => {
        setAutoscroll(e.target.checked)
        autoscrollOutput = e.target.checked
        if (autoscrollOutput) pauseAutoscroll = false
        doAutoscroll()
    }
    const clearterminal = e => {
        currentOutput = []
        monitorDataQuiet = []
        monitorDataVerbose = []
        updateContentType()
    }
    const toogle = e => {
        const { dispatch } = useStoreon()
        dispatch("panel/showterminal", false)
    }
    return (
        <div class="d-flex flex-wrap p-1">
            <div class="d-flex flex-column flex-md-row">
                <div class="control-like p-2">
                    <label
                        class="checkbox-control"
                        id="checkverbose"
                        title={T("S76")}
                    >
                        {T("S76")}
                        <input
                            type="checkbox"
                            checked={isVerbose}
                            onChange={toogleVerbose}
                        />
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="control-like p-2">
                    <label
                        class="checkbox-control"
                        id="checkautoscroll"
                        title={T("S77")}
                    >
                        {T("S77")}
                        <input
                            type="checkbox"
                            checked={isAutoscroll}
                            onChange={toogleAutoscroll}
                        />
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>
            <span style="padding-left:0.4rem;">
                <button
                    type="button"
                    class="btn btn-secondary"
                    title={T("S79")}
                    onClick={clearterminal}
                >
                    <XCircle />
                    <span class="hide-low text-button nowrap">{T("S78")}</span>
                </button>
            </span>
            <div class="ml-auto">
                {" "}
                <button
                    type="button"
                    class="btn btn-light btn-sm"
                    title={T("S86")}
                    onClick={toogle}
                >
                    <X />
                </button>
            </div>
        </div>
    )
}

/*
 *Send command query error
 */
function sendCommandError(errorCode, responseText) {
    globaldispatch({
        type: Action.error,
        errorcode: errorCode,
        msg: "S5",
    })
}

/*
 *Send command query success
 */
function sendCommandSuccess(responseText) {
    let tresponse = responseText.split("\n")
    for (let n = 0; n < tresponse.length; n++) {
        updateTerminal(tresponse[n])
    }
}

/*
 *Send command
 *
 */
function sendCommand(cmd) {
    commandHistory.push(cmd)
    commandHistory.slice(-MAX_HISTORY_SIZE)
    commandHistoryIndex = commandHistory.length
    SendCommand(encodeURIComponent(cmd), sendCommandSuccess, sendCommandError)
    pauseAutoscroll = false
    updateTerminal(">" + cmd)
}

/*
 *Do autoscroll
 *
 *
 */
function doAutoscroll() {
    if (autoscrollOutput && !pauseAutoscroll) {
        document.getElementById(
            "outputTerminalWindow"
        ).scrollTop = document.getElementById(
            "outputTerminalWindow"
        ).scrollHeight
    }
}

/*
 * Terminal Window
 *
 */
const TerminalPanel = () => {
    const { content } = useStoreon("content")
    const { showTerminal } = useStoreon("showTerminal")
    if (!showTerminal) return null
    const [command, setCommand] = useState("")
    const onclick = e => {
        if (command.length > 0) {
            sendCommand(command)
            setCommand("")
        }
    }
    const onInput = e => {
        setCommand(e.target.value.trim())
    }
    const onScroll = e => {
        if (e.target.scrollTop + e.target.offsetHeight != e.target.scrollHeight)
            pauseAutoscroll = true
        else pauseAutoscroll = false
    }
    const onKeyUp = e => {
        if (e.keyCode == 13) {
            sendCommand(command)
            setCommand("")
        }

        if (e.keyCode == 38 || e.keyCode == 40) {
            if (
                e.keyCode == 38 &&
                commandHistory.length > 0 &&
                commandHistoryIndex > 0
            ) {
                commandHistoryIndex--
            } else if (
                e.keyCode == 40 &&
                commandHistoryIndex < commandHistory.length - 1
            ) {
                commandHistoryIndex++
            }
            if (
                commandHistoryIndex >= 0 &&
                commandHistoryIndex < commandHistory.length
            ) {
                setCommand(commandHistory[commandHistoryIndex])
            }
        }
    }
    useEffect(() => {
        doAutoscroll()
    }, [content])
    return (
        <div>
            <div class="p-1">
                <div class="border p-2">
                    <TerminalControls />

                    <div class="input-group">
                        <input
                            type="text"
                            class="form-control"
                            onInput={onInput}
                            onkeyup={onKeyUp}
                            value={command}
                            placeholder={T("S80")}
                        />
                        <div class="input-group-append" title={T("S82")}>
                            <button
                                class="btn btn-primary form-control"
                                onClick={onclick}
                                type="button"
                            >
                                <Send />
                                <span class="hide-low text-button">
                                    {T("S81")}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div class="p-1" />
                    <div
                        id="outputTerminalWindow"
                        class="border customscroll"
                        style="min-height:200px;max-height:200px; overflow: auto;"
                        onscroll={onScroll}
                    >
                        {content}
                    </div>
                </div>
            </div>
        </div>
    )
}

export { TerminalPanel, updateTerminal }