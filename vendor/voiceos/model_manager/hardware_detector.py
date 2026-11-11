import psutil
import multiprocessing


class HardwareDetector:

    def get_system_info(self):

        ram_gb = psutil.virtual_memory().total / (1024**3)

        cpu_cores = multiprocessing.cpu_count()

        return {
            "ram_gb": round(ram_gb, 1),
            "cpu_cores": cpu_cores
        }