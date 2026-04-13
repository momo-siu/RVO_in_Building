#include <jni.h>
#include <string>
#include <memory>
#include <iostream>
#include <vector>

#include "simulator.h"

namespace {

std::string JStringToUtf8(JNIEnv* env, jstring str) {
    if (str == nullptr) {
        return {};
    }
    const char* utfChars = env->GetStringUTFChars(str, nullptr);
    if (utfChars == nullptr) {
        return {};
    }
    std::string result(utfChars);
    env->ReleaseStringUTFChars(str, utfChars);
    return result;
}

rvocpp::RVOSimulator* getSimulator(jlong handle) {
    return reinterpret_cast<rvocpp::RVOSimulator*>(handle);
}

void ClearPendingJavaException(JNIEnv* env) {
    if (env->ExceptionCheck()) {
        env->ExceptionClear();
    }
}

jclass FindClassSafe(JNIEnv* env, const char* className) {
    jclass cls = env->FindClass(className);
    if (cls == nullptr || env->ExceptionCheck()) {
        ClearPendingJavaException(env);
        return nullptr;
    }
    return cls;
}

jfieldID GetFieldIdSafe(JNIEnv* env, jclass cls, const char* name, const char* signature) {
    if (cls == nullptr) return nullptr;
    jfieldID fid = env->GetFieldID(cls, name, signature);
    if (fid == nullptr || env->ExceptionCheck()) {
        ClearPendingJavaException(env);
        return nullptr;
    }
    return fid;
}

jmethodID GetMethodIdSafe(JNIEnv* env, jclass cls, const char* name, const char* signature) {
    if (cls == nullptr) return nullptr;
    jmethodID mid = env->GetMethodID(cls, name, signature);
    if (mid == nullptr || env->ExceptionCheck()) {
        ClearPendingJavaException(env);
        return nullptr;
    }
    return mid;
}

// Helpers to work with java.util.List
int getListSize(JNIEnv* env, jobject listObj) {
    if (listObj == nullptr) return 0;
    jclass listCls = env->GetObjectClass(listObj);
    jmethodID sizeMid = GetMethodIdSafe(env, listCls, "size", "()I");
    if (sizeMid == nullptr) return 0;
    return static_cast<int>(env->CallIntMethod(listObj, sizeMid));
}

jobject getListElement(JNIEnv* env, jobject listObj, int index) {
    if (listObj == nullptr) return nullptr;
    jclass listCls = env->GetObjectClass(listObj);
    jmethodID getMid = GetMethodIdSafe(env, listCls, "get", "(I)Ljava/lang/Object;");
    if (getMid == nullptr) return nullptr;
    return env->CallObjectMethod(listObj, getMid, index);
}

std::vector<int> toIntVector(JNIEnv* env, jobject listObj) {
    std::vector<int> result;
    if (listObj == nullptr) return result;
    jclass integerCls = FindClassSafe(env, "java/lang/Integer");
    jmethodID intValueMid = GetMethodIdSafe(env, integerCls, "intValue", "()I");
    if (integerCls == nullptr || intValueMid == nullptr) return result;

    int size = getListSize(env, listObj);
    result.reserve(size);
    for (int i = 0; i < size; ++i) {
        jobject elem = getListElement(env, listObj, i);
        if (elem != nullptr) {
            jint v = env->CallIntMethod(elem, intValueMid);
            result.push_back(static_cast<int>(v));
            env->DeleteLocalRef(elem);
        }
    }
    return result;
}

std::vector<double> toDoubleVector(JNIEnv* env, jobject listObj) {
    std::vector<double> result;
    if (listObj == nullptr) return result;
    jclass doubleCls = FindClassSafe(env, "java/lang/Double");
    jmethodID doubleValueMid = GetMethodIdSafe(env, doubleCls, "doubleValue", "()D");
    if (doubleCls == nullptr || doubleValueMid == nullptr) return result;

    int size = getListSize(env, listObj);
    result.reserve(size);
    for (int i = 0; i < size; ++i) {
        jobject elem = getListElement(env, listObj, i);
        if (elem != nullptr) {
            jdouble v = env->CallDoubleMethod(elem, doubleValueMid);
            result.push_back(static_cast<double>(v));
            env->DeleteLocalRef(elem);
        }
    }
    return result;
}

} // namespace

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeCreateSimulator(JNIEnv*, jclass) {
    try {
        auto* simulator = new rvocpp::RVOSimulator();
        return reinterpret_cast<jlong>(simulator);
    } catch (...) {
        return 0;
    }
}

JNIEXPORT void JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeDestroySimulator(JNIEnv*, jclass, jlong handle) {
    auto* simulator = getSimulator(handle);
    delete simulator;
}

JNIEXPORT jboolean JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeLoadFromJson(JNIEnv* env, jclass, jlong handle, jstring jsonContent) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return JNI_FALSE;
    }
    std::string payload = JStringToUtf8(env, jsonContent);
    try {
        return simulator->loadFromJSONContent(payload) ? JNI_TRUE : JNI_FALSE;
    } catch (...) {
        return JNI_FALSE;
    }
}

JNIEXPORT jboolean JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeSetOutputDir(JNIEnv* env, jclass, jlong handle, jstring outputDir) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return JNI_FALSE;
    }
    simulator->setOutputDir(JStringToUtf8(env, outputDir));
    return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeRunSimulation(JNIEnv*, jclass, jlong handle) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return JNI_FALSE;
    }
    try {
        return simulator->run() ? JNI_TRUE : JNI_FALSE;
    } catch (...) {
        return JNI_FALSE;
    }
}

JNIEXPORT jboolean JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeSaveResults(JNIEnv*, jclass, jlong handle) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return JNI_FALSE;
    }
    try {
        return simulator->saveResults() ? JNI_TRUE : JNI_FALSE;
    } catch (...) {
        return JNI_FALSE;
    }
}

JNIEXPORT jint JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeGetFrameCount(JNIEnv*, jclass, jlong handle) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return 0;
    }
    return simulator->frameCount();
}

JNIEXPORT jint JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeGetCompletedAgentCount(JNIEnv*, jclass, jlong handle) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr) {
        return 0;
    }
    return simulator->completedAgentCount();
}

JNIEXPORT jboolean JNICALL
Java_com_rvo_rvoserver_nativebridge_NativeRvoBridge_nativeLoadFromData(JNIEnv* env, jclass,
                                                                       jlong handle, jobject inputObj) {
    auto* simulator = getSimulator(handle);
    if (simulator == nullptr || inputObj == nullptr) {
        return JNI_FALSE;
    }

    try {
        jclass inputCls = env->GetObjectClass(inputObj);

        // config field
        jfieldID configFid = GetFieldIdSafe(
                env,
                inputCls,
                "config",
                "Lcom/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeSimulationConfig;"
        );
        jobject configObj = env->GetObjectField(inputObj, configFid);

        rvocpp::SimulationConfig cfg{};
        if (configObj != nullptr) {
            jclass cfgCls = env->GetObjectClass(configObj);
            jfieldID bIDFid = GetFieldIdSafe(env, cfgCls, "bID", "I");
            jfieldID scaleFid = GetFieldIdSafe(env, cfgCls, "scale", "D");
            jfieldID statusFid = GetFieldIdSafe(env, cfgCls, "status", "I");
            jfieldID weightFid = GetFieldIdSafe(env, cfgCls, "weight", "I");
            jfieldID kFid = GetFieldIdSafe(env, cfgCls, "k", "D");
            jfieldID imgX0Fid = GetFieldIdSafe(env, cfgCls, "imgX0", "D");
            jfieldID imgY0Fid = GetFieldIdSafe(env, cfgCls, "imgY0", "D");
            jfieldID sTFid = GetFieldIdSafe(env, cfgCls, "sT", "D");
            jfieldID fileNameFid = GetFieldIdSafe(env, cfgCls, "fileName", "Ljava/lang/String;");
            jfieldID outputDirFid = GetFieldIdSafe(env, cfgCls, "outputDir", "Ljava/lang/String;");

            if (bIDFid) cfg.bID = env->GetIntField(configObj, bIDFid);
            if (scaleFid) cfg.scale = env->GetDoubleField(configObj, scaleFid);
            if (statusFid) cfg.status = env->GetIntField(configObj, statusFid);
            if (weightFid) cfg.weight = env->GetIntField(configObj, weightFid);
            if (kFid) cfg.k = env->GetDoubleField(configObj, kFid);
            if (imgX0Fid) cfg.imgX0 = env->GetDoubleField(configObj, imgX0Fid);
            if (imgY0Fid) cfg.imgY0 = env->GetDoubleField(configObj, imgY0Fid);
            if (sTFid) cfg.sT = env->GetDoubleField(configObj, sTFid);

            jstring jFileName = fileNameFid ? static_cast<jstring>(env->GetObjectField(configObj, fileNameFid)) : nullptr;
            jstring jOutputDir = outputDirFid ? static_cast<jstring>(env->GetObjectField(configObj, outputDirFid)) : nullptr;
            cfg.fileName = JStringToUtf8(env, jFileName);
            cfg.outputDir = JStringToUtf8(env, jOutputDir);
        }

        // agents list
        jfieldID agentsFid = GetFieldIdSafe(env, inputCls, "agents", "Ljava/util/List;");
        jobject agentsListObj = env->GetObjectField(inputObj, agentsFid);

        std::vector<rvocpp::Agent> agents;
        int agentCount = getListSize(env, agentsListObj);
        agents.reserve(agentCount);

        jclass agentCls = FindClassSafe(env, "com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeAgent");
        jfieldID aIdFid = GetFieldIdSafe(env, agentCls, "id", "I");
        jfieldID axFid = GetFieldIdSafe(env, agentCls, "x", "D");
        jfieldID ayFid = GetFieldIdSafe(env, agentCls, "y", "D");
        jfieldID aVelFid = GetFieldIdSafe(env, agentCls, "velocity", "D");
        jfieldID aStartFid = GetFieldIdSafe(env, agentCls, "startTime", "D");
        jfieldID aExitIdFid = GetFieldIdSafe(env, agentCls, "exitId", "I");
        jfieldID aFloorIdFid = GetFieldIdSafe(env, agentCls, "floorId", "I");
        jfieldID aTargetFloorIdFid = GetFieldIdSafe(env, agentCls, "targetFloorId", "I");
        jfieldID aConnectorIdFid = GetFieldIdSafe(env, agentCls, "connectorId", "I");
        jfieldID aConnectorStateFid = GetFieldIdSafe(env, agentCls, "connectorState", "I");
        jfieldID aTransferRemainingTimeFid = GetFieldIdSafe(env, agentCls, "transferRemainingTime", "D");
        jfieldID aGraphNodeFid = GetFieldIdSafe(env, agentCls, "graphNodeIndex", "I");
        jfieldID aRoomIdsFid = GetFieldIdSafe(env, agentCls, "roomIds", "Ljava/util/List;");
        jfieldID aWaypointXsFid = GetFieldIdSafe(env, agentCls, "waypointXs", "Ljava/util/List;");
        jfieldID aWaypointYsFid = GetFieldIdSafe(env, agentCls, "waypointYs", "Ljava/util/List;");

        for (int i = 0; i < agentCount; ++i) {
            jobject agentObj = getListElement(env, agentsListObj, i);
            if (agentObj == nullptr) continue;
            rvocpp::Agent a{};
            if (aIdFid) a.id = env->GetIntField(agentObj, aIdFid);
            if (axFid) a.x = env->GetDoubleField(agentObj, axFid);
            if (ayFid) a.y = env->GetDoubleField(agentObj, ayFid);
            if (aVelFid) a.velocity = env->GetDoubleField(agentObj, aVelFid);
            if (aStartFid) a.startTime = env->GetDoubleField(agentObj, aStartFid);
            if (aExitIdFid) a.exitId = env->GetIntField(agentObj, aExitIdFid);
            if (aFloorIdFid) a.floorId = env->GetIntField(agentObj, aFloorIdFid);
            if (aTargetFloorIdFid) a.targetFloorId = env->GetIntField(agentObj, aTargetFloorIdFid);
            if (aConnectorIdFid) a.connectorId = env->GetIntField(agentObj, aConnectorIdFid);
            if (aConnectorStateFid) a.connectorState = env->GetIntField(agentObj, aConnectorStateFid);
            if (aTransferRemainingTimeFid) a.transferRemainingTime = env->GetDoubleField(agentObj, aTransferRemainingTimeFid);
            if (aGraphNodeFid) a.graphNodeIndex = env->GetIntField(agentObj, aGraphNodeFid);

            jobject roomIdsList = aRoomIdsFid ? env->GetObjectField(agentObj, aRoomIdsFid) : nullptr;
            jobject waypointXsList = aWaypointXsFid ? env->GetObjectField(agentObj, aWaypointXsFid) : nullptr;
            jobject waypointYsList = aWaypointYsFid ? env->GetObjectField(agentObj, aWaypointYsFid) : nullptr;

            a.roomIds = toIntVector(env, roomIdsList);
            a.waypointXs = toDoubleVector(env, waypointXsList);
            a.waypointYs = toDoubleVector(env, waypointYsList);

            agents.push_back(std::move(a));
            env->DeleteLocalRef(agentObj);
        }

        // obstacles list
        jfieldID obstaclesFid = env->GetFieldID(inputCls, "obstacles", "Ljava/util/List;");
        jobject obstaclesListObj = env->GetObjectField(inputObj, obstaclesFid);
        std::vector<rvocpp::Obstacle> obstacles;
        int obstacleCount = getListSize(env, obstaclesListObj);
        obstacles.reserve(obstacleCount);

        jclass obstacleCls = env->FindClass("com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeObstacle");
        jfieldID oIdFid = env->GetFieldID(obstacleCls, "id", "I");
        jfieldID ox1Fid = env->GetFieldID(obstacleCls, "x1", "D");
        jfieldID oy1Fid = env->GetFieldID(obstacleCls, "y1", "D");
        jfieldID ox2Fid = env->GetFieldID(obstacleCls, "x2", "D");
        jfieldID oy2Fid = env->GetFieldID(obstacleCls, "y2", "D");
        jfieldID oFloorIdFid = env->GetFieldID(obstacleCls, "floorId", "I");

        for (int i = 0; i < obstacleCount; ++i) {
            jobject obstacleObj = getListElement(env, obstaclesListObj, i);
            if (obstacleObj == nullptr) continue;
            rvocpp::Obstacle o{};
            o.id = env->GetIntField(obstacleObj, oIdFid);
            o.x1 = env->GetDoubleField(obstacleObj, ox1Fid);
            o.y1 = env->GetDoubleField(obstacleObj, oy1Fid);
            o.x2 = env->GetDoubleField(obstacleObj, ox2Fid);
            o.y2 = env->GetDoubleField(obstacleObj, oy2Fid);
            o.floorId = env->GetIntField(obstacleObj, oFloorIdFid);
            obstacles.push_back(o);
            env->DeleteLocalRef(obstacleObj);
        }

        // exits list
        jfieldID exitsFid = env->GetFieldID(inputCls, "exits", "Ljava/util/List;");
        jobject exitsListObj = env->GetObjectField(inputObj, exitsFid);
        std::vector<rvocpp::Exit> exits;
        int exitCount = getListSize(env, exitsListObj);
        exits.reserve(exitCount);

        jclass exitCls = env->FindClass("com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeExit");
        jfieldID eIdFid = env->GetFieldID(exitCls, "id", "J");
        jfieldID ex0Fid = env->GetFieldID(exitCls, "x0", "D");
        jfieldID ey0Fid = env->GetFieldID(exitCls, "y0", "D");
        jfieldID ex1Fid = env->GetFieldID(exitCls, "x1", "D");
        jfieldID ey1Fid = env->GetFieldID(exitCls, "y1", "D");
        jfieldID eFloorIdFid = env->GetFieldID(exitCls, "floorId", "I");
        jfieldID eCapFid = env->GetFieldID(exitCls, "capacity", "I");
        jfieldID eNameFid = env->GetFieldID(exitCls, "name", "Ljava/lang/String;");

        for (int i = 0; i < exitCount; ++i) {
            jobject exitObj = getListElement(env, exitsListObj, i);
            if (exitObj == nullptr) continue;
            rvocpp::Exit e{};
            e.id = static_cast<long>(env->GetLongField(exitObj, eIdFid));
            e.x0 = env->GetDoubleField(exitObj, ex0Fid);
            e.y0 = env->GetDoubleField(exitObj, ey0Fid);
            e.x1 = env->GetDoubleField(exitObj, ex1Fid);
            e.y1 = env->GetDoubleField(exitObj, ey1Fid);
            e.floorId = env->GetIntField(exitObj, eFloorIdFid);
            e.capacity = env->GetIntField(exitObj, eCapFid);
            jstring jName = static_cast<jstring>(env->GetObjectField(exitObj, eNameFid));
            e.name = JStringToUtf8(env, jName);
            exits.push_back(e);
            env->DeleteLocalRef(exitObj);
        }

        // navPoints list
        jfieldID navPointsFid = GetFieldIdSafe(env, inputCls, "navPoints", "Ljava/util/List;");
        jobject navPointsListObj = env->GetObjectField(inputObj, navPointsFid);
        std::vector<rvocpp::NavPoint> navPoints;
        int navCount = getListSize(env, navPointsListObj);
        navPoints.reserve(navCount);

        jclass navCls = FindClassSafe(env, "com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeNavPoint");
        jfieldID nxFid = GetFieldIdSafe(env, navCls, "x", "D");
        jfieldID nyFid = GetFieldIdSafe(env, navCls, "y", "D");
        jfieldID nStateFid = GetFieldIdSafe(env, navCls, "state", "I");
        jfieldID nFloorIdFid = GetFieldIdSafe(env, navCls, "floorId", "I");
        jfieldID nKindFid = GetFieldIdSafe(env, navCls, "kind", "I");
        jfieldID nConnectorIdFid = GetFieldIdSafe(env, navCls, "connectorId", "I");
        jfieldID nToFloorIdFid = GetFieldIdSafe(env, navCls, "toFloorId", "I");
        jfieldID nRoomIdsFid = GetFieldIdSafe(env, navCls, "roomIds", "Ljava/util/List;");

        for (int i = 0; i < navCount; ++i) {
            jobject navObj = getListElement(env, navPointsListObj, i);
            if (navObj == nullptr) continue;
            rvocpp::NavPoint np{};
            if (nxFid) np.x = env->GetDoubleField(navObj, nxFid);
            if (nyFid) np.y = env->GetDoubleField(navObj, nyFid);
            if (nStateFid) np.state = env->GetIntField(navObj, nStateFid);
            if (nFloorIdFid) np.floorId = env->GetIntField(navObj, nFloorIdFid);
            if (nKindFid) np.kind = env->GetIntField(navObj, nKindFid);
            if (nConnectorIdFid) np.connectorId = env->GetIntField(navObj, nConnectorIdFid);
            if (nToFloorIdFid) np.toFloorId = env->GetIntField(navObj, nToFloorIdFid);
            jobject nRoomIdsList = nRoomIdsFid ? env->GetObjectField(navObj, nRoomIdsFid) : nullptr;
            np.roomIds = toIntVector(env, nRoomIdsList);
            navPoints.push_back(np);
            env->DeleteLocalRef(navObj);
        }

        // rooms list
        jfieldID roomsFid = env->GetFieldID(inputCls, "rooms", "Ljava/util/List;");
        jobject roomsListObj = env->GetObjectField(inputObj, roomsFid);
        std::vector<rvocpp::RoomC> rooms;
        int roomCount = getListSize(env, roomsListObj);
        rooms.reserve(roomCount);

        jclass roomCls = env->FindClass("com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeRoom");
        jfieldID rRidFid = env->GetFieldID(roomCls, "rid", "I");
        jfieldID rFloorIdFid = env->GetFieldID(roomCls, "floorId", "I");
        jfieldID rPeopleCountFid = env->GetFieldID(roomCls, "peopleCount", "I");
        jfieldID rWallsFid = env->GetFieldID(roomCls, "walls", "Ljava/util/List;");

        jclass pointCls = env->FindClass("com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativePoint");
        jfieldID pxFid = env->GetFieldID(pointCls, "x", "D");
        jfieldID pyFid = env->GetFieldID(pointCls, "y", "D");

        for (int i = 0; i < roomCount; ++i) {
            jobject roomObj = getListElement(env, roomsListObj, i);
            if (roomObj == nullptr) continue;
            rvocpp::RoomC r{};
            r.rid = env->GetIntField(roomObj, rRidFid);
            r.floorId = env->GetIntField(roomObj, rFloorIdFid);
            r.peopleCount = env->GetIntField(roomObj, rPeopleCountFid);

            jobject wallsListObj = env->GetObjectField(roomObj, rWallsFid);
            int wallSize = getListSize(env, wallsListObj);
            r.walls.reserve(wallSize);
            for (int w = 0; w < wallSize; ++w) {
                jobject ptObj = getListElement(env, wallsListObj, w);
                if (ptObj == nullptr) continue;
                rvocpp::Point2D p{};
                p.x = env->GetDoubleField(ptObj, pxFid);
                p.y = env->GetDoubleField(ptObj, pyFid);
                r.walls.push_back(p);
                env->DeleteLocalRef(ptObj);
            }

            rooms.push_back(r);
            env->DeleteLocalRef(roomObj);
        }

        // peopleGroups list
        jfieldID peopleGroupsFid = env->GetFieldID(inputCls, "peopleGroups", "Ljava/util/List;");
        jobject peopleGroupsListObj = env->GetObjectField(inputObj, peopleGroupsFid);
        std::vector<rvocpp::PeopleGroupC> peopleGroups;
        int groupCount = getListSize(env, peopleGroupsListObj);
        peopleGroups.reserve(groupCount);

        jclass groupCls = env->FindClass("com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativePeopleGroup");
        jfieldID gIdFid = env->GetFieldID(groupCls, "id", "I");
        jfieldID gFloorIdFid = env->GetFieldID(groupCls, "floorId", "I");
        jfieldID gPeopleCountFid = env->GetFieldID(groupCls, "peopleCount", "I");
        jfieldID gWallsFid = env->GetFieldID(groupCls, "walls", "Ljava/util/List;");

        for (int i = 0; i < groupCount; ++i) {
            jobject groupObj = getListElement(env, peopleGroupsListObj, i);
            if (groupObj == nullptr) continue;
            rvocpp::PeopleGroupC g{};
            g.id = env->GetIntField(groupObj, gIdFid);
            g.floorId = env->GetIntField(groupObj, gFloorIdFid);
            g.peopleCount = env->GetIntField(groupObj, gPeopleCountFid);

            jobject wallsListObj = env->GetObjectField(groupObj, gWallsFid);
            int wallSize = getListSize(env, wallsListObj);
            g.walls.reserve(wallSize);
            for (int w = 0; w < wallSize; ++w) {
                jobject ptObj = getListElement(env, wallsListObj, w);
                if (ptObj == nullptr) continue;
                rvocpp::Point2D p{};
                p.x = env->GetDoubleField(ptObj, pxFid);
                p.y = env->GetDoubleField(ptObj, pyFid);
                g.walls.push_back(p);
                env->DeleteLocalRef(ptObj);
            }

            peopleGroups.push_back(g);
            env->DeleteLocalRef(groupObj);
        }

        // connectors list (optional)
        jfieldID connectorsFid = GetFieldIdSafe(env, inputCls, "connectors", "Ljava/util/List;");
        jobject connectorsListObj = connectorsFid ? env->GetObjectField(inputObj, connectorsFid) : nullptr;
        std::vector<rvocpp::Connector> connectors;
        int connectorCount = getListSize(env, connectorsListObj);
        connectors.reserve(connectorCount);

        jclass connectorCls = FindClassSafe(env, "com/rvo/rvoserver/nativebridge/NativeSimulationInput$NativeConnector");
        jfieldID cIdFid = GetFieldIdSafe(env, connectorCls, "id", "I");
        jfieldID cTypeFid = GetFieldIdSafe(env, connectorCls, "type", "I");
        jfieldID cFromFloorFid = GetFieldIdSafe(env, connectorCls, "fromFloor", "I");
        jfieldID cToFloorFid = GetFieldIdSafe(env, connectorCls, "toFloor", "I");
        jfieldID cEntryXFid = GetFieldIdSafe(env, connectorCls, "entryX", "D");
        jfieldID cEntryYFid = GetFieldIdSafe(env, connectorCls, "entryY", "D");
        jfieldID cExitXFid = GetFieldIdSafe(env, connectorCls, "exitX", "D");
        jfieldID cExitYFid = GetFieldIdSafe(env, connectorCls, "exitY", "D");
        jfieldID cCapacityFid = GetFieldIdSafe(env, connectorCls, "capacity", "I");
        jfieldID cServiceTimeFid = GetFieldIdSafe(env, connectorCls, "serviceTime", "D");

        for (int i = 0; i < connectorCount; ++i) {
            jobject connectorObj = getListElement(env, connectorsListObj, i);
            if (connectorObj == nullptr) continue;
            rvocpp::Connector c{};
            if (cIdFid) c.id = env->GetIntField(connectorObj, cIdFid);
            if (cTypeFid) c.type = env->GetIntField(connectorObj, cTypeFid);
            if (cFromFloorFid) c.fromFloor = env->GetIntField(connectorObj, cFromFloorFid);
            if (cToFloorFid) c.toFloor = env->GetIntField(connectorObj, cToFloorFid);
            if (cEntryXFid) c.entryX = env->GetDoubleField(connectorObj, cEntryXFid);
            if (cEntryYFid) c.entryY = env->GetDoubleField(connectorObj, cEntryYFid);
            if (cExitXFid) c.exitX = env->GetDoubleField(connectorObj, cExitXFid);
            if (cExitYFid) c.exitY = env->GetDoubleField(connectorObj, cExitYFid);
            if (cCapacityFid) c.capacity = env->GetIntField(connectorObj, cCapacityFid);
            if (cServiceTimeFid) c.serviceTime = env->GetDoubleField(connectorObj, cServiceTimeFid);
            connectors.push_back(c);
            env->DeleteLocalRef(connectorObj);
        }

        bool ok = simulator->loadFromData(cfg, std::move(agents), std::move(obstacles),
                                          std::move(exits), std::move(navPoints), std::move(connectors),
                                          std::move(rooms), std::move(peopleGroups));
        return ok ? JNI_TRUE : JNI_FALSE;
    } catch (...) {
        return JNI_FALSE;
    }
}

}
