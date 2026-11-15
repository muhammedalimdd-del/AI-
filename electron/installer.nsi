Unicode True

!ifndef APP_VERSION
  !define APP_VERSION "1.0.0"
!endif
!ifndef UNPACKED_DIR
  !define UNPACKED_DIR "releases/win-unpacked"
!endif
!ifndef BUILD_DIR
  !define BUILD_DIR "build"
!endif
!ifndef OUT_FILE
  !define OUT_FILE "downloads/AI-Video-Maker-Setup.exe"
!endif

!define APP_NAME "AI Video Maker"
!define COMPANY_NAME "AI TIMES"
!define EXECUTABLE_NAME "AI Video Maker.exe"
!define UNINSTALLER_NAME "Uninstall AI Video Maker.exe"
!define REG_UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\AIVideoMaker"
!define REG_APP_KEY "Software\AI Video Maker"

Name "${APP_NAME}"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\${APP_NAME}"
InstallDirRegKey HKCU "${REG_APP_KEY}" "InstallLocation"
RequestExecutionLevel user
ShowInstDetails show
ShowUnInstDetails show
SetCompressor /SOLID zlib

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "CompanyName" "${COMPANY_NAME}"
VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 ${COMPANY_NAME}"
VIAddVersionKey "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"

!include "MUI2.nsh"

!define MUI_ICON "${BUILD_DIR}/icon.ico"
!define MUI_UNICON "${BUILD_DIR}/icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to AI Video Maker Setup"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install AI Video Maker on your Windows computer so you can open and use it like a normal desktop application.$\r$\n$\r$\nDesktop and Start Menu shortcuts will be created automatically."
!define MUI_FINISHPAGE_TITLE "AI Video Maker Setup Complete"
!define MUI_FINISHPAGE_TEXT "AI Video Maker has been installed on your computer. You can launch it anytime from your Windows Desktop or Start Menu."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXECUTABLE_NAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch AI Video Maker now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "AI Video Maker" SecMain
  SectionIn RO

  ; Ensure any running instance closes cleanly before replacing files (supports auto-updates)
  nsExec::ExecToLog 'taskkill /F /IM "${EXECUTABLE_NAME}" /T'

  SetOutPath "$INSTDIR"
  File /r "${UNPACKED_DIR}/*"

  WriteRegStr HKCU "${REG_APP_KEY}" "InstallLocation" "$INSTDIR"

  ; Write Windows Uninstaller and Add/Remove Programs registration
  WriteUninstaller "$INSTDIR\${UNINSTALLER_NAME}"
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "Publisher" "${COMPANY_NAME}"
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\resources\icon.ico"
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\${UNINSTALLER_NAME}"'
  WriteRegStr HKCU "${REG_UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\${UNINSTALLER_NAME}" /S'
  WriteRegDWORD HKCU "${REG_UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${REG_UNINSTALL_KEY}" "NoRepair" 1

  ; Create Windows Desktop shortcut with custom icon
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${EXECUTABLE_NAME}" "" "$INSTDIR\resources\icon.ico" 0

  ; Create Windows Start Menu folder and shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${EXECUTABLE_NAME}" "" "$INSTDIR\resources\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall ${APP_NAME}.lnk" "$INSTDIR\${UNINSTALLER_NAME}" "" "$INSTDIR\resources\icon.ico" 0
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill /F /IM "${EXECUTABLE_NAME}" /T'

  Delete "$DESKTOP\${APP_NAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"
  RMDir /r "$INSTDIR"

  DeleteRegKey HKCU "${REG_UNINSTALL_KEY}"
  DeleteRegKey HKCU "${REG_APP_KEY}"
SectionEnd
