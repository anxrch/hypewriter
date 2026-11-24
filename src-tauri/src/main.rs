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

/// AppImage는 빌드 머신(ubuntu-22.04)의 WebKitGTK·Mesa를 묶어 가는데, 이 낡은 GBM이 최신 NVIDIA
/// 드라이버와 맞지 않아 DMA-BUF 렌더러가 버퍼를 못 만든다("Failed to create GBM buffer").
/// 그러면 창은 뜨지만 내용이 하나도 그려지지 않는다. AppImage로 실행될 때만 그 렌더러를 끈다.
/// 사용자가 직접 값을 정했으면 그대로 둔다.
#[cfg(target_os = "linux")]
fn disable_dmabuf_renderer_in_appimage() {
    use std::env;

    if env::var_os("APPIMAGE").is_none() {
        return;
    }
    if env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

/// linuxdeploy GTK 플러그인의 AppImage 훅은 `GDK_BACKEND=x11`을 무조건 export한다(tauri#8541 대응).
/// 그런데 Wayland 세션에서 XWayland로 돌리면 타자기 모드를 끄는 순간처럼 화면을 크게 다시 그릴 때
/// 앱이 아무 메시지 없이 종료된다(NVIDIA에서 확인). Wayland 세션이면 이 강제를 걷어
/// GTK가 기본 순서(wayland → x11)로 고르게 한다. 그래야 IME 보정(prefer_wayland_im_module)도 적용된다.
/// 사용자가 백엔드를 직접 고르려면 `HYPEWRITER_GDK_BACKEND`를 쓴다(훅이 GDK_BACKEND를 덮어쓰므로).
#[cfg(target_os = "linux")]
fn undo_appimage_x11_force() {
    use std::env;

    if env::var_os("APPIMAGE").is_none() {
        return;
    }
    if let Some(backend) = env::var_os("HYPEWRITER_GDK_BACKEND") {
        env::set_var("GDK_BACKEND", backend);
        return;
    }
    if env::var_os("WAYLAND_DISPLAY").is_none() {
        return;
    }
    if env::var("GDK_BACKEND").map(|b| b.trim() == "x11").unwrap_or(false) {
        env::remove_var("GDK_BACKEND");
    }
}

fn main() {
    #[cfg(target_os = "linux")]
    {
        // IME 보정이 GDK_BACKEND를 보고 판단하므로 이걸 먼저 한다
        undo_appimage_x11_force();
        prefer_wayland_im_module();
        disable_dmabuf_renderer_in_appimage();
    }

    hypewriter_lib::run()
}
