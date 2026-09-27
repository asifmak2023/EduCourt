<?php

namespace App\Enums;

enum HostelRoomType: string
{
    case Single = 'single';
    case Double = 'double';
    case Triple = 'triple';
    case Dorm = 'dorm';
}
