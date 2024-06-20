import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { useRef } from "react"
import "./Toast.css"

export enum ToastType {
    Normal = 0,
    Error = 1,
    Action = 2 //With action
}

const TOAST_CLASSES = ["success", "error", ""]

export const Toast: React.FC<{ show?: boolean, setShow?: Dispatch<StateUpdater<boolean>>, maxTime?:number, top?: string, title: string, actionTitle?: string, action?: () => void, type: ToastType }> = ({ show, title, actionTitle, top, type, action, maxTime, setShow }) => {
    const ref = useRef<HTMLDivElement | null>(null)
    const timer = useRef<number | null>(null)

    useEffect(() => {
        if (timer.current) {
            clearTimeout(timer.current)
            timer.current = null
        }
        if (show) {
            if (ref.current) {
                ref.current.style.display = "flex"
                timer.current = setTimeout(() => {
                    if (ref.current) {
                        ref.current.classList.toggle("visible", true)
                    }
                    timer.current = setTimeout(()=>{
                        if(setShow){
                            setShow(false)
                        }
                    }, maxTime ?? 1000)
                }, 0)
            }
        } else {
            if (ref.current) {
                ref.current.classList.toggle("visible", false)
            }
            timer.current = setTimeout(() => {
                if (ref.current) {
                    ref.current.style.display = "none"
                }
            }, 1000)
        }
        () => {
            if (timer.current) {
                clearTimeout(timer.current)
            }
        }
    }, [show])

    return <div class={"baka-toast no-select"} ref={ref} style={{ top: top ?? "5rem" }}>
        <div class={"baka-toast-content "+TOAST_CLASSES[Math.max(0, Math.min(TOAST_CLASSES.length, type))]}>
            <div>{title}</div>
            {type === ToastType.Action && <div onClick={action}>{actionTitle}</div>}
        </div>
    </div>
}