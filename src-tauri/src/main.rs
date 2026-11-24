#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

/// Wayland 세션에서 GTK_IM_MODULE=fcitx면 WebKitGTK의 IME 조합 글자가 커서 자리에 그려지지 않고,
/// 커서에서 일정하게 어긋난 별도 상자에 뜬다(fcitx GTK 모듈은 D-Bus로 붙어 창의 실제 위치를 모름).
/// GTK 내장 wayland 모듈(text-input-v3)을 쓰면 컴포지터가 입력기와 이어 줘서 제자리에 보인다.
/// GTK가 초기화되기 전에, 즉 다른 스레드가 생기기 전에 정해야 한다.
#[cfg(target_os = "linux")]
fn prefer_wayland_im_module() {
    use std::env;

    if env::var_os("HYPEWRITER_KEEP_IM_MODULE").is_some() {
        return;
    }
    if env::var_os("WAYLAND_DISPLAY").is_none() {
        return;
    }
    // X11(XWayland)로 강제한 경우엔 wayland 모듈이 동작하지 않는다
    if let Ok(backend) = env::var("GDK_BACKEND") {
        if !backend.split(',').next().unwrap_or("").trim().eq_ignore_ascii_case("wayland") {
            return;
        }
    }
    let is_fcitx = env::var("GTK_IM_MODULE")
        .map(|m| m.trim().to_ascii_lowercase().starts_with("fcitx"))
        .unwrap_or(false);
    if is_fcitx {
        env::set_var("GTK_IM_MODULE", "wayland");
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    prefer_wayland_im_module();

    hypewriter_lib::run()
}
