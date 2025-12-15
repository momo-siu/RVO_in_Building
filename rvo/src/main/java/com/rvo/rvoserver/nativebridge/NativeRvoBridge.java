package com.rvo.rvoserver.nativebridge;

/**
 * Thin Java wrapper around the native RVOSimulator. This class is intentionally kept free of
 * business logic so that higher-level services can compose it however they like.
 */
public final class NativeRvoBridge implements AutoCloseable {

    static {
        try {
            System.load("C:\\Users\\19255\\Desktop\\dachuang\\rvo\\native-simulator\\build\\Release\\native_rvo_interface.dll");
        } catch (UnsatisfiedLinkError e) {
            System.loadLibrary("native_rvo_interface");
        }
    }

    private final long handle;
    private boolean closed = false;

    public NativeRvoBridge() {
        this.handle = nativeCreateSimulator();
        if (this.handle == 0) {
            throw new IllegalStateException("Failed to create native RVOSimulator instance");
        }
    }

    public boolean loadFromJson(String jsonPayload) {
        ensureOpen();
        return nativeLoadFromJson(handle, jsonPayload);
    }

    public boolean loadFromData(NativeSimulationInput input) {
        ensureOpen();
        if (input == null) {
            throw new IllegalArgumentException("NativeSimulationInput cannot be null");
        }
        return nativeLoadFromData(handle, input);
    }

    public void setOutputDir(String outputDir) {
        ensureOpen();
        nativeSetOutputDir(handle, outputDir);
    }

    public boolean runSimulation() {
        ensureOpen();
        return nativeRunSimulation(handle);
    }

    public boolean saveResults() {
        ensureOpen();
        return nativeSaveResults(handle);
    }

    public int getFrameCount() {
        ensureOpen();
        return nativeGetFrameCount(handle);
    }

    public int getCompletedAgentCount() {
        ensureOpen();
        return nativeGetCompletedAgentCount(handle);
    }

    private void ensureOpen() {
        if (closed) {
            throw new IllegalStateException("NativeRvoBridge has been closed");
        }
    }

    @Override
    public void close() {
        if (!closed) {
            nativeDestroySimulator(handle);
            closed = true;
        }
    }

    // Native methods implemented in native_interface.cpp
    private static native long nativeCreateSimulator();

    private static native void nativeDestroySimulator(long handle);

    private static native boolean nativeLoadFromJson(long handle, String jsonContent);

    private static native boolean nativeSetOutputDir(long handle, String outputDir);

    private static native boolean nativeLoadFromData(long handle, NativeSimulationInput input);

    private static native boolean nativeRunSimulation(long handle);

    private static native boolean nativeSaveResults(long handle);

    private static native int nativeGetFrameCount(long handle);

    private static native int nativeGetCompletedAgentCount(long handle);
}
